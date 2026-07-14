"use client";

import type { DeliverableType } from "@/app/generated/prisma/client";
import {
  Alert,
  Button,
  Input,
  Label,
  Modal,
  TextArea,
  TextField,
} from "@heroui/react";
import {
  IconFile,
  IconFileText,
  IconLink,
  IconNote,
  IconPaperclip,
  IconPhoto,
} from "@tabler/icons-react";
import { useRef, useState } from "react";

const DELIVERABLE_TYPES: {
  id: DeliverableType;
  label: string;
  icon: typeof IconLink;
  accept?: string;
}[] = [
  { id: "LINK", label: "Link", icon: IconLink },
  { id: "TEXT", label: "Note", icon: IconNote },
  { id: "IMAGE", label: "Image", icon: IconPhoto, accept: "image/*" },
  {
    id: "DOCUMENT",
    label: "Document",
    icon: IconFileText,
    accept: ".pdf,.doc,.docx,.txt,.md,.ppt,.pptx,.xls,.xlsx",
  },
  { id: "FILE", label: "File", icon: IconFile },
];

const MAX_BYTES = 10 * 1024 * 1024;

interface Props {
  swapId: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export default function AddDeliverableModal({
  swapId,
  isOpen,
  onOpenChange,
  onSuccess,
}: Props) {
  const [addType, setAddType] = useState<DeliverableType>("LINK");
  const [dTitle, setDTitle] = useState("");
  const [dLink, setDLink] = useState("");
  const [dText, setDText] = useState("");
  const [dFile, setDFile] = useState<{
    data: string;
    name: string;
    size: number;
    mime: string;
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  function reset() {
    setAddType("LINK");
    setDTitle("");
    setDLink("");
    setDText("");
    setDFile(null);
    setError("");
  }

  function handleOpen(open: boolean) {
    if (!open) reset();
    onOpenChange(open);
  }

  function handleFilePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_BYTES) {
      setError("File must be under 10MB.");
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setDFile({ data: reader.result as string, name: file.name, size: file.size, mime: file.type });
      setError("");
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  async function submit() {
    setError("");
    const body: Record<string, unknown> = {
      type: addType,
      title: dTitle.trim() || undefined,
    };

    if (addType === "LINK") {
      if (!dLink.trim()) { setError("Please enter a link."); return; }
      body.resourceLink = dLink.trim();
    } else if (addType === "TEXT") {
      if (!dText.trim()) { setError("Please enter some text."); return; }
      body.notes = dText.trim();
    } else {
      if (!dFile) { setError("Please choose a file."); return; }
      body.file = dFile.data;
      body.fileName = dFile.name;
      body.fileSize = dFile.size;
      body.mimeType = dFile.mime;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/swaps/${swapId}/deliver`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Submission failed.");
        return;
      }
      handleOpen(false);
      onSuccess?.();
    } catch {
      setError("Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal.Backdrop isOpen={isOpen} onOpenChange={handleOpen}>
      <Modal.Container>
        <Modal.Dialog className="sm:max-w-md">
          <Modal.CloseTrigger />
          <Modal.Header>
            <Modal.Heading>Add Deliverable</Modal.Heading>
            <p className="text-sm text-muted mt-1">
              Add an outcome of this exchange — a link, a note, or a file. You
              can add as many as you like.
            </p>
          </Modal.Header>
          <Modal.Body>
            <div className="flex flex-col gap-4 p-1">
              {/* Type picker */}
              <div className="flex flex-wrap gap-2">
                {DELIVERABLE_TYPES.map((t) => {
                  const Icon = t.icon;
                  const active = addType === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        setAddType(t.id);
                        setDFile(null);
                        setError("");
                      }}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm transition-colors ${
                        active
                          ? "border-accent bg-accent/10 text-accent font-medium"
                          : "border-border text-muted hover:text-foreground"
                      }`}
                    >
                      <Icon size={14} />
                      {t.label}
                    </button>
                  );
                })}
              </div>

              <TextField className="w-full" value={dTitle} onChange={setDTitle}>
                <Label>Title (optional)</Label>
                <Input placeholder="e.g. Intro to React - recording" />
              </TextField>

              {addType === "LINK" && (
                <TextField
                  className="w-full"
                  value={dLink}
                  onChange={setDLink}
                  isRequired
                >
                  <Label>Link</Label>
                  <Input placeholder="https://…" type="url" />
                </TextField>
              )}

              {addType === "TEXT" && (
                <TextField
                  className="w-full"
                  value={dText}
                  onChange={setDText}
                  isRequired
                >
                  <Label>Text</Label>
                  <TextArea placeholder="Write your note…" rows={4} />
                </TextField>
              )}

              {(addType === "IMAGE" ||
                addType === "DOCUMENT" ||
                addType === "FILE") && (
                <div className="flex flex-col gap-2">
                  <Label>File</Label>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full border border-dashed border-border rounded-xl px-4 py-4 text-sm text-muted hover:text-foreground hover:border-accent/40 transition-colors flex items-center justify-center gap-2"
                  >
                    <IconPaperclip size={15} />
                    {dFile ? dFile.name : "Choose a file (max 10MB)"}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={DELIVERABLE_TYPES.find((t) => t.id === addType)?.accept}
                    className="hidden"
                    onChange={handleFilePick}
                  />
                </div>
              )}

              {error && (
                <Alert status="danger">
                  <Alert.Indicator />
                  <Alert.Content>
                    <Alert.Description>{error}</Alert.Description>
                  </Alert.Content>
                </Alert>
              )}
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button slot="close" variant="secondary">
              Cancel
            </Button>
            <Button
              className="bg-success text-success-foreground font-semibold"
              onPress={submit}
              isPending={submitting}
            >
              Add
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
