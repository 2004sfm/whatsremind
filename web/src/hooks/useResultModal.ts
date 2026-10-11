import { useState, useCallback } from "react";

export interface ResultModalState {
  isOpen: boolean;
  type: "success" | "error";
  message: string;
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
  close: () => void;
}

/**
 * Shared state for the settings result modal, used by every credential handler.
 */
export function useResultModal(): ResultModalState {
  const [isOpen, setIsOpen] = useState(false);
  const [type, setType] = useState<"success" | "error">("success");
  const [message, setMessage] = useState("");

  const showSuccess = useCallback((msg: string) => {
    setType("success");
    setMessage(msg);
    setIsOpen(true);
  }, []);

  const showError = useCallback((msg: string) => {
    setType("error");
    setMessage(msg);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => setIsOpen(false), []);

  return { isOpen, type, message, showSuccess, showError, close };
}
