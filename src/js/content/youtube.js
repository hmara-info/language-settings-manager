import defaultHandler from './default';
import { reportError } from '../networking';

export default class googleSearchHandler extends defaultHandler {
  handlerName = 'youtube';

  SUPPORTED_LANGUAGES() {
    return ['uk'];
  }
}
