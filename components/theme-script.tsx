/**
 * Resolves the theme before the first paint.
 *
 * This has to be a blocking inline script in <head>. A post-mount effect
 * would paint the default theme first and then correct it, which is the
 * flash we are avoiding.
 *
 * Light is the deliberate default for first-time visitors, regardless of
 * the OS setting. A stored choice always wins over it.
 *
 * The catch branch matters as much as the happy path: if localStorage
 * throws — private mode, storage disabled — the attribute must still be
 * written, because every component styles against it and an unset
 * `data-theme` would leave the page on whatever `:root` alone resolves
 * to. It happens to be light either way, but relying on that coincidence
 * would break the moment the palettes were reorganised.
 */
const script = `(function(){try{var s=localStorage.getItem("theme");var t=(s==="light"||s==="dark")?s:"light";document.documentElement.setAttribute("data-theme",t);}catch(e){document.documentElement.setAttribute("data-theme","light");}})();`;

export function ThemeScript() {
  return (
    <script
      // Static, self-authored string with no interpolation.
      dangerouslySetInnerHTML={{ __html: script }}
    />
  );
}
