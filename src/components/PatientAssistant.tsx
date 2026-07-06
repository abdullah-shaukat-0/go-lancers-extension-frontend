import React, { useMemo, useState } from "react";
import { Bot, CalendarClock, ClipboardList, HeartPulse, Stethoscope, Sparkles, X } from "lucide-react";

type AssistantMessage = {
  sender: "bot" | "user";
  text: string;
};

interface PatientAssistantProps {
  title?: string;
  subtitle?: string;
  specializations?: string[];
  onBookAppointment?: (specialization?: string, summary?: string) => void;
  onOpenRecords?: () => void;
  onOpenAppointments?: () => void;
  onClose?: () => void;
}

const quickActions = [
  { label: "Book appointment", prompt: "Help me book an appointment" },
  { label: "Visit prep", prompt: "What should I prepare for my visit?" },
  { label: "Medication reminders", prompt: "Set a medication reminder" },
  { label: "View records", prompt: "Show my prescriptions and records" },
];

const PatientAssistant: React.FC<PatientAssistantProps> = ({
  title = "Care Assistant",
  subtitle = "A quick helper for appointments, reminders, and daily patient tasks.",
  specializations = [],
  onBookAppointment,
  onOpenRecords,
  onOpenAppointments,
  onClose,
}) => {
  const [messages, setMessages] = useState<AssistantMessage[]>([
    {
      sender: "bot",
      text: "Hi, I can help you book an appointment, prepare for a visit, or guide you to your medical records. What do you need today?",
    },
  ]);
  const [input, setInput] = useState("");

  const sortedSpecializations = useMemo(() => {
    return [...new Set(specializations.filter(Boolean))].sort((left, right) => left.localeCompare(right));
  }, [specializations]);

  const replyWithAction = (text: string, next?: () => void) => {
    setMessages((current) => [...current, { sender: "bot", text }]);
    next?.();
  };

  const handleIntent = (text: string) => {
    const normalized = text.toLowerCase();

    const matchedSpecialization = sortedSpecializations.find((specialization) =>
      normalized.includes(specialization.toLowerCase())
    );

    if (normalized.includes("book") || normalized.includes("appointment") || normalized.includes("doctor")) {
      replyWithAction(
        matchedSpecialization
          ? `I can help with a ${matchedSpecialization} appointment. Open the booking form and I will keep that specialty in mind.`
          : "I can help you book an appointment. Open the booking form and tell me the specialty you want.",
        () => onBookAppointment?.(matchedSpecialization, "Need help booking an appointment.")
      );
      return;
    }

    if (normalized.includes("record") || normalized.includes("prescription") || normalized.includes("report")) {
      replyWithAction("I can point you to your prescriptions and consultation history.", onOpenRecords);
      return;
    }

    if (normalized.includes("medicine") || normalized.includes("medication") || normalized.includes("reminder")) {
      replyWithAction(
        "I can help you keep track of medication reminders. Please follow the instructions from your doctor and your pharmacy label.",
        onOpenRecords
      );
      return;
    }

    if (normalized.includes("prep") || normalized.includes("prepare") || normalized.includes("visit")) {
      replyWithAction(
        "Before a visit, bring your ID, recent reports, current medicines, and a short symptom summary. If you want, I can take you to the appointment form next.",
        onOpenAppointments
      );
      return;
    }

    replyWithAction(
      "I can help with appointments, medical records, reminders, and visit preparation. Try asking me to book an appointment or open your records."
    );
  };

  const handleSend = (prompt?: string) => {
    const text = (prompt || input).trim();
    if (!text) return;

    setMessages((current) => [...current, { sender: "user", text }]);
    setInput("");
    handleIntent(text);
  };

  return (
    <section className="assistant-shell glass-panel">
      <div className="assistant-header">
        <div className="assistant-header-copy">
          <div className="assistant-kicker">
            <Sparkles size={14} />
            <span>{title}</span>
          </div>
          <h3>Daily care, simplified</h3>
          <p>{subtitle}</p>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <div className="assistant-badge">
            <Bot size={16} />
            <span>Smart helper</span>
          </div>
          {onClose && (
            <button 
              type="button" 
              onClick={onClose} 
              style={{ 
                background: "transparent", 
                border: "none", 
                color: "var(--text-secondary)", 
                cursor: "pointer", 
                padding: "4px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "color 0.2s"
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = "var(--danger)"}
              onMouseLeave={(e) => e.currentTarget.style.color = "var(--text-secondary)"}
              title="Close Assistant"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      <div className="assistant-quick-actions">
        {quickActions.map((action) => (
          <button key={action.label} type="button" className="assistant-chip" onClick={() => handleSend(action.prompt)}>
            {action.label}
          </button>
        ))}
      </div>

      <div className="assistant-message-list" aria-live="polite">
        {messages.map((message, index) => (
          <div key={`${message.sender}-${index}`} className={`assistant-message assistant-${message.sender}`}>
            <span>{message.text}</span>
          </div>
        ))}
      </div>

      <div className="assistant-suggestion-row">
        <button type="button" className="assistant-suggestion" onClick={() => handleSend("Book an appointment")}> 
          <CalendarClock size={14} />
          <span>Book visit</span>
        </button>
        <button type="button" className="assistant-suggestion" onClick={() => handleSend("Show my prescriptions")}> 
          <ClipboardList size={14} />
          <span>Records</span>
        </button>
        <button type="button" className="assistant-suggestion" onClick={() => handleSend("I need visit prep tips")}> 
          <HeartPulse size={14} />
          <span>Prep tips</span>
        </button>
        <button type="button" className="assistant-suggestion" onClick={() => handleSend("Help me find the right doctor")}> 
          <Stethoscope size={14} />
          <span>Find doctor</span>
        </button>
      </div>

      <form
        className="assistant-input-row"
        onSubmit={(event) => {
          event.preventDefault();
          handleSend();
        }}
      >
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Ask about appointments, reminders, or records..."
        />
        <button type="submit" className="btn btn-primary">
          Send
        </button>
      </form>
    </section>
  );
};

export default PatientAssistant;