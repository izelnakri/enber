import test from 'ava';
import countTime from '../../lib/utils/count-time.js';

test('countTime() works', async (t) => {
  const currentTime = +(new Date());
  const timer = countTime();

  t.plan(4);
  t.true(0 > currentTime < timer.startTime < (currentTime + 1000));

  await (new Promise((resolve) => setTimeout(resolve, 3000)));

  const endTimeInUnix = timer.stop();
  const endTime = +(new Date());

  t.true(endTimeInUnix > 0);
  t.true(currentTime < timer.startTime < endTimeInUnix < endTime);
  t.true(currentTime + 3000 < endTimeInUnix < currentTime + 3200);
});
