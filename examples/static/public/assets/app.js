const res = await fetch("/api/ping");
const body = await res.json();
document.body.insertAdjacentHTML("beforeend", `<p>API says: ${body.pong}</p>`);
