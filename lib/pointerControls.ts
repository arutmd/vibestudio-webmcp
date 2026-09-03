export type PointerButtonPreference = "right" | "left";

export type PointerGestureAction = "point" | "dismiss" | "pass";

export function pointerGestureAction(
  preference: PointerButtonPreference,
  button: number,
  _interactiveTarget = false,
): PointerGestureAction {
  const pointButton = preference === "right" ? 2 : 0;
  const dismissButton = preference === "right" ? 0 : 2;

  if (button === pointButton) return "point";
  if (button === dismissButton) return "dismiss";
  return "pass";
}

export function pointerButtonsMask(preference: PointerButtonPreference): number {
  return preference === "right" ? 2 : 1;
}
