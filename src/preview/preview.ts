// Local preview only: runs the real content script on a fake Azure DevOps page.
import './chromeShim.ts';
import { adapters } from '../content/adapters/index.ts';
import { startContent } from '../content/runtime.ts';

startContent(adapters);
