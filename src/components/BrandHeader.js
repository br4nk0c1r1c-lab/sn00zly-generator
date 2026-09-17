import { BASE_PATH } from "@/lib/base-path";

export function Brandmark() {
  return (
    <a className="brandmark" href="https://sn00zly.com">
      <svg className="moon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M20.5 14.6A8.7 8.7 0 0 1 9.4 3.5a8.7 8.7 0 1 0 11.1 11.1Z" fill="currentColor" />
        <circle cx="17.5" cy="5.5" r="1.3" fill="#C9A463" />
      </svg>
      Sn00zly
    </a>
  );
}

export function TopBar({ signedIn }) {
  return (
    <nav className="top-bar" aria-label="Account">
      {signedIn ? (
        <a href={`${BASE_PATH}/planner`}>Open my planner →</a>
      ) : (
        <a href={`${BASE_PATH}/login`}>Member sign in</a>
      )}
    </nav>
  );
}
