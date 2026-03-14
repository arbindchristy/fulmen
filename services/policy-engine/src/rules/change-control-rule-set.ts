import type { PolicyBundle } from '@fulmen/contracts';
import { changeControlDefaultPolicy } from '@fulmen/policies';

export const changeControlRuleSet = changeControlDefaultPolicy as PolicyBundle;
