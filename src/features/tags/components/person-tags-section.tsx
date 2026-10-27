"use client";

import { TagPicker } from "./tag-picker";
import { togglePersonTagAction } from "../actions";
import type { Tag } from "../../../db/schema";

interface PersonTagsSectionProps {
  personId: string;
  availableTags: Tag[];
  selectedTagIds: string[];
}

export function PersonTagsSection({ personId, availableTags, selectedTagIds }: PersonTagsSectionProps) {
  return (
    <TagPicker
      availableTags={availableTags}
      selectedTagIds={selectedTagIds}
      onToggle={(tagId, add) => togglePersonTagAction(personId, tagId, add)}
      label="Tags"
    />
  );
}
