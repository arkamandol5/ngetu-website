const link = document.getElementById('destination');
const target = new URL(link.href);
target.search = location.search;
target.hash = location.hash;
link.href = target.href;
location.replace(target.href);
