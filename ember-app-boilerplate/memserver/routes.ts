import ENV from '../config/environment';

export default function() {
  this.urlPrefix = ENV.APP ? ENV.APP.API_HOST : 'http://localhost:3000';

  // this.get('/users/:id', (request) => {
  //   return { user: { id: 1, name: 'Izel' } };
  // })
}
