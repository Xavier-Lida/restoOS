export type ActionResult =
  | { ok: true; message?: string; redirectTo?: string }
  | { ok: false; message: string };

export function actionOk(message?: string, redirectTo?: string): ActionResult {
  return { ok: true, message, redirectTo };
}

export function actionFail(message: string): ActionResult {
  return { ok: false, message };
}
