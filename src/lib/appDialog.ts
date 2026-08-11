export type AppDialogTone = "info" | "warning" | "danger" | "success";

export type AppDialogRequest = {
  id: number;
  kind: "alert" | "confirm";
  message: string;
  title?: string;
  tone?: AppDialogTone;
  confirmLabel?: string;
  cancelLabel?: string;
  resolve: (value: boolean) => void;
};

type DialogListener = (request: AppDialogRequest) => void;

let listener: DialogListener | null = null;
let nextId = 1;

export function subscribeAppDialog(nextListener: DialogListener) {
  listener = nextListener;
  return () => {
    if (listener === nextListener) listener = null;
  };
}

function openDialog(
  kind: AppDialogRequest["kind"],
  message: string,
  options: Omit<AppDialogRequest, "id" | "kind" | "message" | "resolve"> = {},
) {
  if (!listener) {
    if (kind === "confirm") return Promise.resolve(window.confirm(message));
    window.alert(message);
    return Promise.resolve(true);
  }

  return new Promise<boolean>((resolve) => {
    listener?.({ id: nextId++, kind, message, ...options, resolve });
  });
}

export function appAlert(
  message: string,
  options?: Omit<AppDialogRequest, "id" | "kind" | "message" | "resolve">,
) {
  return openDialog("alert", message, options);
}

export function appConfirm(
  message: string,
  options?: Omit<AppDialogRequest, "id" | "kind" | "message" | "resolve">,
) {
  return openDialog("confirm", message, options);
}
