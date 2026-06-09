"use client";

import { useEffect } from "react";
import type { GeneratedProject } from "@zeno/shared";
import ZenoMark from "@/components/home/zeno-mark";

export interface SectionClickData {
  sectionName: string;
  sectionHtml: string;
}

type Props = {
  project: GeneratedProject;
  editMode?: boolean;
  onSectionClick?: (data: SectionClickData) => void;
};

const OVERLAY_SCRIPT = `
<script>
(function() {
  let overlay = null;

  function createOverlay(el) {
    removeOverlay();
    const rect = el.getBoundingClientRect();
    overlay = document.createElement('div');
    overlay.style.cssText = [
      'position:fixed',
      'top:' + rect.top + 'px',
      'left:' + rect.left + 'px',
      'width:' + rect.width + 'px',
      'height:' + rect.height + 'px',
      'border:2px solid #29DEA9',
      'background:rgba(41,222,169,0.05)',
      'pointer-events:none',
      'z-index:99999',
      'box-sizing:border-box',
    ].join(';');
    document.body.appendChild(overlay);
  }

  function removeOverlay() {
    if (overlay) { overlay.remove(); overlay = null; }
  }

  document.addEventListener('mouseover', function(e) {
    var section = e.target.closest('[data-section]');
    if (section) createOverlay(section);
    else removeOverlay();
  });

  document.addEventListener('mouseout', function(e) {
    if (!e.relatedTarget || !e.relatedTarget.closest('[data-section]')) {
      removeOverlay();
    }
  });

  document.addEventListener('click', function(e) {
    var section = e.target.closest('[data-section]');
    if (section) {
      e.preventDefault();
      e.stopPropagation();
      var sectionName = section.getAttribute('data-section');
      var sectionHtml = section.outerHTML;
      window.parent.postMessage({
        type: 'SECTION_CLICK',
        sectionName: sectionName,
        sectionHtml: sectionHtml,
      }, '*');
    }
  });
})();
</script>
`;

function injectOverlayScript(html: string): string {
  if (html.includes("</body>")) {
    return html.replace("</body>", `${OVERLAY_SCRIPT}</body>`);
  }
  return html + OVERLAY_SCRIPT;
}

export default function WebContainerPreview({ project, editMode, onSectionClick }: Props) {
  const htmlFile = project.files.find((f) => f.path === "/index.html");

  useEffect(() => {
    if (!onSectionClick) return;

    function handleMessage(e: MessageEvent) {
      if (e.data?.type === "SECTION_CLICK") {
        onSectionClick?.({
          sectionName: e.data.sectionName,
          sectionHtml: e.data.sectionHtml,
        });
      }
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [onSectionClick]);

  if (!htmlFile) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-5 bg-[#0a0a0a]">
        <ZenoMark shimmer className="h-8 w-8" />
        <p className="text-[13px] text-white/40">Preview 준비 중...</p>
      </div>
    );
  }

  const srcDoc = editMode ? injectOverlayScript(htmlFile.content) : htmlFile.content;

  return (
    <div className="relative h-full w-full overflow-hidden bg-white">
      {editMode && (
        <div className="pointer-events-none absolute inset-0 z-10 rounded-[inherit] border-2 border-[#29DEA9]" />
      )}
      <iframe
        srcDoc={srcDoc}
        title="Generated Project Preview"
        className="h-full w-full bg-white"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
      />
    </div>
  );
}
