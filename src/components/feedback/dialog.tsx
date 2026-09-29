"use client";

import { useEffect, useId, useRef, type KeyboardEvent, type ReactNode } from "react";

type DialogProps = {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  closeLabel: string;
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
};

function outsideDialog(element: HTMLDialogElement, clientX: number, clientY: number) {
  const bounds = element.getBoundingClientRect();
  return clientX < bounds.left || clientX > bounds.right || clientY < bounds.top || clientY > bounds.bottom;
}

function containTabKey(event: KeyboardEvent<HTMLDialogElement>) {
  if (event.key !== "Tab" || event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
  const dialog = event.currentTarget;
  const candidates = Array.from(dialog.querySelectorAll<HTMLElement>(
    "a[href],area[href],button,input,select,textarea,iframe,object,embed,summary,[contenteditable],[tabindex]",
  )).filter((element) => {
    if (element.tabIndex < 0 || element.matches(":disabled") || element.closest('[hidden],[inert],[aria-hidden="true"]')) return false;
    const style = getComputedStyle(element);
    return style.visibility === "visible" && element.getClientRects().length > 0;
  });
  const focusable = candidates.filter((element) => {
    if (!(element instanceof HTMLInputElement) || element.type !== "radio" || !element.name) return true;
    const group = candidates.filter((candidate): candidate is HTMLInputElement => candidate instanceof HTMLInputElement && candidate.type === "radio" && candidate.name === element.name && candidate.form === element.form);
    return element === (group.find((radio) => radio.checked) ?? group[0]);
  }).sort((first, second) => (first.tabIndex || Infinity) - (second.tabIndex || Infinity));
  const first = focusable[0];
  const last = focusable.at(-1);
  // Native modality excludes the page, but browsers can otherwise move Tab into browser chrome.
  if (!first || !last) { event.preventDefault(); return; }
  const active = document.activeElement;
  if ((event.shiftKey && active === first) || (!event.shiftKey && active === last) || !dialog.contains(active)) {
    event.preventDefault();
    (event.shiftKey ? last : first).focus();
  }
}

export function Dialog({ open, onClose, title, description, closeLabel, children, actions, className = "" }: DialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const backdropPointerDownRef = useRef(false);
  const id = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      // Native modality makes the surrounding document inert; the Tab handler cycles its controls.
      dialog.showModal();
      closeRef.current?.focus({ preventScroll: true });
    } else if (!open && dialog.open) {
      dialog.close();
      if (returnFocusRef.current?.isConnected) returnFocusRef.current.focus({ preventScroll: true });
    }
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    return () => {
      if (dialog?.open) {
        dialog.close();
        if (returnFocusRef.current?.isConnected) returnFocusRef.current.focus({ preventScroll: true });
      }
    };
  }, []);

  return (
    <dialog
      ref={dialogRef}
      className={`feedback-dialog ${className}`.trim()}
      aria-labelledby={`${id}-title`}
      aria-describedby={description ? `${id}-description` : undefined}
      onKeyDown={containTabKey}
      onCancel={(event) => { event.preventDefault(); onClose(); }}
      onClose={() => { if (open) onClose(); }}
      onPointerDown={(event) => {
        backdropPointerDownRef.current = event.target === event.currentTarget && outsideDialog(event.currentTarget, event.clientX, event.clientY);
      }}
      onClick={(event) => {
        const dismiss = backdropPointerDownRef.current && event.target === event.currentTarget && outsideDialog(event.currentTarget, event.clientX, event.clientY);
        backdropPointerDownRef.current = false;
        if (dismiss) onClose();
      }}
    >
      <div className="feedback-dialog-heading">
        <h2 id={`${id}-title`}>{title}</h2>
        <button ref={closeRef} type="button" className="button button--ghost button--small" onClick={onClose}>{closeLabel}</button>
      </div>
      {description ? <p id={`${id}-description`} className="feedback-dialog-description">{description}</p> : null}
      <div className="feedback-dialog-body">{children}</div>
      {actions ? <div className="feedback-dialog-actions">{actions}</div> : null}
    </dialog>
  );
}
