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
import { useDeferredValue, useMemo, useState } from "react";

// Dedupe: the source list has a few repeated entries, which would collide on
// the ListBox item `id`/`key` (RAC requires unique, stable ids).
const ALL_SKILLS: string[] = Array.from(new Set(skillsData.skills));

// The dataset has ~1.4k skills. Rendering them all would mount thousands of
// DOM nodes, so we filter the full list ourselves and only render a capped
// slice of matches. This keeps search exhaustive while the list stays light.
const MAX_RESULTS = 50;

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
  const [filterText, setFilterText] = useState("");

  // Keep the search input responsive: typing updates `filterText` immediately
  // (drives the input), but the heavy results list recomputes/re-renders off a
  // deferred value, so React can interrupt stale work as the user keeps typing.
  const deferredFilter = useDeferredValue(filterText);

  const visibleSkills = useMemo(() => {
    const query = deferredFilter.trim();
    const matches = query
      ? ALL_SKILLS.filter((skill) => contains(skill, query))
      : ALL_SKILLS;

    // Already-selected skills must stay in the rendered collection even when
    // they don't match the current query - otherwise RAC drops them from the
    // multiple-selection state as soon as another item is toggled. Keep them
    // pinned at the top, then fill with capped, not-yet-selected matches.
    const selectedSet = new Set(selected);
    const capped = matches
      .filter((skill) => !selectedSet.has(skill))
      .slice(0, MAX_RESULTS);
    return [...selected, ...capped];
  }, [deferredFilter, contains, selected]);

  return (
    <Autocomplete
      fullWidth
      allowsEmptyCollection
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
        <Autocomplete.Filter
          inputValue={filterText}
          onInputChange={setFilterText}
        >
          <SearchField
            autoFocus
            name="search"
            aria-label="Search skills"
            variant="secondary"
            className="sticky top-0 z-10"
          >
            <SearchField.Group>
              <SearchField.SearchIcon />
              <SearchField.Input placeholder="Search skills..." />
              {/* <SearchField.ClearButton className="size-3 overflow-hidden" /> */}
            </SearchField.Group>
          </SearchField>
          <ListBox
            className="max-h-105 overflow-y-auto"
            renderEmptyState={() => <EmptyState>No skills found</EmptyState>}
          >
            {visibleSkills.map((skill) => (
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
