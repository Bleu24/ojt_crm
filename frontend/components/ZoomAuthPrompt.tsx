"use client";

import React from "react";

interface ZoomAuthPromptProps {
  open: boolean;
  onClose: () => void;
  onConnect: () => void;
  connecting?: boolean;
}

export default function ZoomAuthPrompt({ open, onClose, onConnect, connecting }: ZoomAuthPromptProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="mac-card relative w-full max-w-md rounded-2xl border border-white/20 bg-white/10 backdrop-blur-xl shadow-2xl p-6 text-white">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/20 border border-blue-400/30">🔗</div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold">Connect Zoom to schedule interviews</h3>
            <p className="mt-1 text-sm text-gray-300">
              Your Zoom account isn’t connected yet. Authorize the app to create and send Zoom invites on your behalf.
            </p>
          </div>
        </div>

        <div className="mt-4 rounded-lg border border-white/10 bg-black/20 p-4 text-sm text-gray-200">
          <ul className="list-disc ml-5 space-y-1">
            <li>We’ll only request permissions to create and manage meetings.</li>
            <li>You’ll be redirected to Zoom to grant access, then back here.</li>
            <li>After approval, we’ll resume scheduling automatically.</li>
          </ul>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 border border-white/20 transition-colors"
            disabled={connecting}
          >
            Cancel
          </button>
          <button
            onClick={onConnect}
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 transition-all disabled:opacity-50"
            disabled={connecting}
          >
            {connecting ? "Opening Zoom…" : "Connect Zoom"}
          </button>
        </div>
      </div>
    </div>
  );
}
