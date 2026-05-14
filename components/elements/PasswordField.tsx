"use client";

import { useState } from "react";
import { Button, InputGroup, Label, TextField } from "@heroui/react";
import { IconEye, IconEyeOff } from "@tabler/icons-react";

interface PasswordFieldProps {
  value: string;
  onChange: (value: string) => void;
  name?: string;
  label?: string;
  placeholder?: string;
  isRequired?: boolean;
  minLength?: number;
  className?: string;
}

export default function PasswordField({
  value,
  onChange,
  name = "password",
  label = "Password",
  placeholder = "••••••••",
  isRequired,
  minLength,
  className = "w-full",
}: PasswordFieldProps) {
  const [show, setShow] = useState(false);

  return (
    <TextField
      name={name}
      value={value}
      onChange={onChange}
      isRequired={isRequired}
      minLength={minLength}
      className={className}
    >
      <Label>{label}</Label>
      <InputGroup className="overflow-hidden">
        <InputGroup.Input
          type={show ? "text" : "password"}
          placeholder={placeholder}
          className="bg-background"
        />
        <InputGroup.Suffix className="pr-0">
          <Button
            isIconOnly
            aria-label={show ? "Hide password" : "Show password"}
            size="sm"
            variant="ghost"
            onPress={() => setShow((v) => !v)}
          >
            {show ? <IconEyeOff className="size-4" /> : <IconEye className="size-4" />}
          </Button>
        </InputGroup.Suffix>
      </InputGroup>
    </TextField>
  );
}
