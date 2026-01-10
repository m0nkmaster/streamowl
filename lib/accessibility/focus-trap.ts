/**
 * Focus trap utility for modal dialogs
 * Ensures keyboard navigation stays within the modal when open
 */

/**
 * Get all focusable elements within a container
 */
function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const focusableSelectors = [
    "a[href]",
    "button:not([disabled])",
    "textarea:not([disabled])",
    "input:not([disabled])",
    "select:not([disabled])",
    '[tabindex]:not([tabindex="-1"])',
  ].join(", ");

  return Array.from(
    container.querySelectorAll(focusableSelectors),
  ) as HTMLElement[];
}

/**
 * Trap focus within a modal element
 * Returns cleanup function
 * @param modalElement - The modal container element
 * @param onClose - Optional callback to call when Escape is pressed
 */
export function trapFocus(
  modalElement: HTMLElement,
  onClose?: () => void,
): () => void {
  const focusableElements = getFocusableElements(modalElement);

  if (focusableElements.length === 0) {
    return () => {}; // No focusable elements, nothing to trap
  }

  // Store the element that had focus before modal opened
  const previousActiveElement = document.activeElement as HTMLElement | null;

  // Focus the first focusable element
  focusableElements[0]?.focus();

  // Handle Tab key to cycle through focusable elements
  const handleTabKey = (e: KeyboardEvent) => {
    if (e.key !== "Tab") return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (e.shiftKey) {
      // Shift + Tab: move backwards
      if (document.activeElement === firstElement) {
        e.preventDefault();
        lastElement?.focus();
      }
    } else {
      // Tab: move forwards
      if (document.activeElement === lastElement) {
        e.preventDefault();
        firstElement?.focus();
      }
    }
  };

  // Handle Escape key to close modal
  const handleEscapeKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      if (onClose) {
        onClose();
      } else {
        // Fallback: find close button and click it
        const closeButton = modalElement.querySelector(
          '[aria-label*="close" i], [aria-label*="Close"]',
        ) as HTMLElement;
        if (closeButton) {
          closeButton.click();
        }
      }
    }
  };

  modalElement.addEventListener("keydown", handleTabKey);
  modalElement.addEventListener("keydown", handleEscapeKey);

  // Return cleanup function
  return () => {
    modalElement.removeEventListener("keydown", handleTabKey);
    modalElement.removeEventListener("keydown", handleEscapeKey);

    // Restore focus to previous element when modal closes
    if (previousActiveElement && document.contains(previousActiveElement)) {
      previousActiveElement.focus();
    }
  };
}
