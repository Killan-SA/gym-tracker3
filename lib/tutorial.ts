import { getUserSetting, setUserSetting } from './database';
export function needsTutorial(): boolean { return getUserSetting('tutorial_v1') === null; }
export function finishTutorial(skipped: boolean = false) { setUserSetting('tutorial_v1', skipped ? 'skipped' : 'complete'); }
