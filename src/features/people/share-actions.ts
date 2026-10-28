"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "../auth/service";
import {
  createShareLink,
  revokeShareLink,
  listShareLinksForPerson,
} from "./share-service";

export async function createShareLinkAction(input: {
  personId: string;
  expiresInDays?: number | null;
  label?: string;
}) {
  const user = await requireUser();
  const link = await createShareLink(user.id, input);
  revalidatePath(`/en/people/${input.personId}`);
  revalidatePath(`/bn/people/${input.personId}`);
  return {
    success: true,
    link: {
      id: link.id,
      token: link.token,
      label: link.label,
      expiresAt: link.expiresAt ? link.expiresAt.toISOString() : null,
      revokedAt: link.revokedAt ? link.revokedAt.toISOString() : null,
      accessCount: link.accessCount,
      createdAt: link.createdAt.toISOString(),
    },
  };
}

export async function revokeShareLinkAction(linkId: string, personId: string) {
  const user = await requireUser();
  const link = await revokeShareLink(user.id, linkId);
  revalidatePath(`/en/people/${personId}`);
  revalidatePath(`/bn/people/${personId}`);
  return {
    success: true,
    link: {
      id: link.id,
      revokedAt: link.revokedAt ? link.revokedAt.toISOString() : null,
    },
  };
}

export async function getPersonShareLinksAction(personId: string) {
  const user = await requireUser();
  const links = await listShareLinksForPerson(user.id, personId);
  return links.map((l) => ({
    id: l.id,
    token: l.token,
    label: l.label,
    expiresAt: l.expiresAt ? l.expiresAt.toISOString() : null,
    revokedAt: l.revokedAt ? l.revokedAt.toISOString() : null,
    accessCount: l.accessCount,
    lastAccessedAt: l.lastAccessedAt ? l.lastAccessedAt.toISOString() : null,
    createdAt: l.createdAt.toISOString(),
  }));
}
