import { ConfirmOptions, useConfirm } from '../store/confirmStore';

/**
 * Asks "Are you sure?" in a popup and answers true (confirmed) or false (cancelled / dismissed).
 *
 *   if (!(await confirm({ title: 'Delete this photo?', confirmLabel: 'Delete' }))) return;
 */
export function confirm(options: ConfirmOptions): Promise<boolean> {
  return useConfirm.getState().ask(options);
}
