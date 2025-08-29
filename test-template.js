import { marketStatsTemplate } from './commands/sync/templates/misc/market-stats.ts';

console.log('Testing market stats template...');
marketStatsTemplate().then(content => {
  const match = content.match(/```json\n(.*?)\n```/s);
  if (match) {
    console.log('Example Response data:');
    console.log(match[1]);
  } else {
    console.log('No JSON response found in template');
  }
}).catch(error => {
  console.error('Error:', error.message);
});