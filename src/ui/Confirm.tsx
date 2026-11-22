"use client";

export default function Confirm({ title, text, yesLabel, onYes, onClose }: {
  title: string; text: string; yesLabel: string; onYes: () => void; onClose: () => void;
}) {
  return (
    <div className="mask" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal">
        <h3>{title}</h3>
        <p className="mut sm" style={{ margin: "8px 0 4px" }}>{text}</p>
        <button className="btn danger" onClick={onYes}>{yesLabel}</button>
        <button className="btn ghost" onClick={onClose}>Отмена</button>
      </div>
    </div>
  );
}
