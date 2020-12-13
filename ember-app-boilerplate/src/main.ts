import Application from '@ember/application';
import Resolver from './resolver';
import loadInitializers from 'ember-load-initializers';
import config from '../config/environment';

declare global {
  interface FreeObject {
    [propName: string]: any;
  }
}

export default class App extends Application {
  modulePrefix = config.modulePrefix;
  podModulePrefix = config.podModulePrefix;
  Resolver = Resolver;
}

loadInitializers(App, `${config.modulePrefix}/src/init`);
loadInitializers(App, config.modulePrefix);
