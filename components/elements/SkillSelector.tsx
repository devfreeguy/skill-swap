"use client";

import skillsData from "@/assets/data/skills.json";
import type { Key } from "@heroui/react";
import {
  Autocomplete,
  EmptyState,
  Label,
  ListBox,
  SearchField,
  Tag,
  TagGroup,
  useFilter,
} from "@heroui/react";

const ALL_SKILLS: string[] = skillsData.skills;

export default function SkillSelector({
  label,
  selected,
  onChange,
}: {
  label: string;
  selected: string[];
  onChange: (skills: string[]) => void;
}) {
  const { contains } = useFilter({ sensitivity: "base" });

  return (
    <Autocomplete
      fullWidth
      placeholder="Type to search skills..."
      selectionMode="multiple"
      value={selected as Key[]}
      onChange={(keys) => onChange(keys != null ? (keys as string[]) : [])}
    >
      <Label>{label}</Label>
      <Autocomplete.Trigger className="bg-background min-h-none">
        <Autocomplete.Value>
          {({ defaultChildren, isPlaceholder, state }) => {
            if (isPlaceholder || state.selectedItems.length === 0) {
              return defaultChildren;
            }
            return (
              <TagGroup
                size="sm"
                onRemove={(keys) =>
                  onChange(selected.filter((s) => !keys.has(s)))
                }
              >
                <TagGroup.List>
                  {state.selectedItems.map((item) => (
                    <Tag key={item.key as string} id={item.key as string}>
                      {item.key as string}
                    </Tag>
                  ))}
                </TagGroup.List>
              </TagGroup>
            );
          }}
        </Autocomplete.Value>
        <Autocomplete.ClearButton />
        <Autocomplete.Indicator />
      </Autocomplete.Trigger>

      <Autocomplete.Popover>
        <Autocomplete.Filter filter={contains}>
          <SearchField
            name="search"
            aria-label="Search skills"
            variant="secondary"
          >
            <SearchField.Group>
              <SearchField.SearchIcon />
              <SearchField.Input placeholder="Search skills..." />
              <SearchField.ClearButton />
            </SearchField.Group>
          </SearchField>
          <ListBox
            renderEmptyState={() => <EmptyState>No skills found</EmptyState>}
          >
            {ALL_SKILLS.slice(0, 20).map((skill) => (
              <ListBox.Item key={skill} id={skill} textValue={skill}>
                {skill}
                <ListBox.ItemIndicator />
              </ListBox.Item>
            ))}
          </ListBox>
        </Autocomplete.Filter>
      </Autocomplete.Popover>
    </Autocomplete>
  );
}
