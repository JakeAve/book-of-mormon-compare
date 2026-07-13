import { useEffect, useState } from "preact/hooks";
import CloseIcon from "../components/CloseIcon.tsx";
import HeaderIconButton from "../components/HeaderIconButton.tsx";
import { dismissTooltip, isTooltipDismissed } from "./tutorialTooltip.ts";

export default function TutorialTrigger() {
  const [showTooltip, setShowTooltip] = useState(false);

  function dismiss() {
    setShowTooltip(false);
    dismissTooltip();
  }

  useEffect(() => {
    if (!isTooltipDismissed()) setShowTooltip(true);
    globalThis.addEventListener("tutorial:open", dismiss);
    return () => globalThis.removeEventListener("tutorial:open", dismiss);
  }, []);

  function onClick() {
    dismiss();
    globalThis.dispatchEvent(new CustomEvent("tutorial:open"));
  }

  return (
    <>
      <HeaderIconButton
        onClick={onClick}
        label="Open tutorial"
        style={{ right: "3.5rem" }}
        data-tutorial="tutorial-trigger"
      >
        ?
      </HeaderIconButton>
      {showTooltip && (
        <div class="tutorial-tooltip">
          <span>Don't know where to start?</span>
          <button
            type="button"
            class="tutorial-tooltip-close"
            aria-label="Dismiss"
            onClick={dismiss}
          >
            <CloseIcon />
          </button>
        </div>
      )}
    </>
  );
}
