// Plays the restock chime; service workers cannot play audio themselves.
chrome.runtime.onMessage.addListener((message) => {
  if (message?.type !== 'play-chime') return;
  const audio = document.getElementById('chime');
  audio.currentTime = 0;
  void audio.play().catch(() => {});
});
