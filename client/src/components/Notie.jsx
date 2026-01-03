import { useEffect, useRef, useState } from "react";
import "./Notie.css";

/**
 * Notie-style notification component
 * Supports only: success (green) for positive, error (red) for negative
 * Warning and info types are mapped to error (negative)
 */
export function Notie({ message, type = "success", onClose, duration = 3000 }) {
  const timerRef = useRef(null);
  const exitTimerRef = useRef(null);
  const [isExiting, setIsExiting] = useState(false);

  // Handle auto-dismiss timer
  useEffect(() => {
    // Clear any existing timers
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (exitTimerRef.current) {
      clearTimeout(exitTimerRef.current);
      exitTimerRef.current = null;
    }

    // Reset exit state when new message arrives
    if (message) {
      setIsExiting(false);
    }

    // If there's a message, set up auto-dismiss
    if (message && duration > 0) {
      timerRef.current = setTimeout(() => {
        // Start exit animation
        setIsExiting(true);
        // Wait for animation to complete before calling onClose
        exitTimerRef.current = setTimeout(() => {
          if (onClose) {
            onClose();
          }
          setIsExiting(false);
        }, 200); // Match CSS transition duration
      }, duration);
    }

    // Cleanup on unmount or when message changes
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      if (exitTimerRef.current) {
        clearTimeout(exitTimerRef.current);
        exitTimerRef.current = null;
      }
    };
  }, [message, duration, onClose]);

  // Don't render if no message
  if (!message) return null;

  // Map all types to only success (green) or error (red)
  // success = positive notification (green)
  // error, warning, info = negative notification (red)
  const normalizedType = type === "success" ? "success" : "error";

  return (
    <div className={`notie notie--${normalizedType} ${isExiting ? "notie--exiting" : ""}`}>
      <div className="notie-content">
        {message}
      </div>
    </div>
  );
}




