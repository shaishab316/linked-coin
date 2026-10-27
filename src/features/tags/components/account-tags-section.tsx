"use client";

import { TagPicker } from "./tag-picker";
import { toggleAccountTagAction } from "../actions";
import type { Tag } from "../../../db/schema";

interface AccountTagsSectionProps {
  accountId: string;
  availableTags: Tag[];
  selectedTagIds: string[];
}

export function AccountTagsSection({ accountId, availableTags, selectedTagIds }: AccountTagsSectionProps) {
  return (
    <TagPicker
      availableTags={availableTags}
      selectedTagIds={selectedTagIds}
      onToggle={(tagId, add) => toggleAccountTagAction(accountId, tagId, add)}
      label="Tags"
    />
  );
}
