// Never writes anything and never exits: the readiness deadline must fire
// while blocked on read(), and the child must be killed on that path.
setInterval(() => {}, 60_000);
