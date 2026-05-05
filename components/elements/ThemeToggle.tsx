"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Button, Tooltip } from "@heroui/react";
import { IconSun, IconMoon } from "@tabler/icons-react";

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  const isDark = theme === "dark";

  return (
    <Tooltip>
      <Tooltip.Trigger>
        <Button
          variant="ghost"
          size="sm"
          isIconOnly
          className="rounded-full"
          onPress={() => setTheme(isDark ? "light" : "dark")}
        >
          {isDark ? <IconSun size={16} /> : <IconMoon size={16} />}
        </Button>
      </Tooltip.Trigger>
      <Tooltip.Content>
        {isDark ? "Switch to light mode" : "Switch to dark mode"}
      </Tooltip.Content>
    </Tooltip>
  );
}
