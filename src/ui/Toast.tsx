export default function Toast({ msg }: { msg: string }) {
  return <div id="toast" className={msg ? "show" : ""}>{msg}</div>;
}
