const USERNAME_RE = /^[a-z0-9._]{3,20}$/;

export function normalizeUsername(input: string) {
  return input.trim().toLowerCase();
}

export function validateUsername(username: string) {
  if (!USERNAME_RE.test(username)) {
    return {
      ok: false as const,
      message:
        "Username must be 3–20 characters and use only lowercase letters, numbers, . or _",
    };
  }

  return { ok: true as const };
}
