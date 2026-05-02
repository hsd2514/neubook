import { useState, useEffect } from "react";
import { User } from "lucide-react";
import { Card } from "../../../components/ui/Card.jsx";
import { Input } from "../../../components/ui/Input.jsx";
import { Button } from "../../../components/ui/Button.jsx";
import { api } from "../../../services/api.js";

export default function ProfileDetails({ user, refreshUser }) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [brandDisplayName, setBrandDisplayName] = useState("");
  const [brandLogoUrl, setBrandLogoUrl] = useState("");
  const [brandPrimaryColor, setBrandPrimaryColor] = useState("#714b67");
  const [brandAccentColor, setBrandAccentColor] = useState("#006a68");
  const [brandTheme, setBrandTheme] = useState("light");
  const [brandBookingDomain, setBrandBookingDomain] = useState("");
  const [msg, setMsg] = useState("");
  const isBrandOwner = user?.role === "organiser" || user?.role === "admin";

  useEffect(() => {
    if (user) {
      setFullName(user.full_name);
      setEmail(user.email);
      setBrandDisplayName(user.brand_display_name || "");
      setBrandLogoUrl(user.brand_logo_url || "");
      setBrandPrimaryColor(user.brand_primary_color || "#714b67");
      setBrandAccentColor(user.brand_accent_color || "#006a68");
      setBrandTheme(user.brand_theme || "light");
      setBrandBookingDomain(user.brand_booking_domain || "");
    }
  }, [user]);

  async function save(e) {
    e.preventDefault();
    setMsg("");
    try {
      await api("/api/users/me", { method: "PATCH", body: JSON.stringify({ full_name: fullName, email }) });
      if (isBrandOwner) {
        await api("/api/users/me/branding", {
          method: "PATCH",
          body: JSON.stringify({
            brand_display_name: brandDisplayName || null,
            brand_logo_url: brandLogoUrl || null,
            brand_primary_color: brandPrimaryColor,
            brand_accent_color: brandAccentColor,
            brand_theme: brandTheme,
            brand_booking_domain: brandBookingDomain || null,
          }),
        });
      }
      await refreshUser();
      setMsg("Profile updated successfully.");
    } catch (ex) { setMsg(ex.message); }
  }

  return (
    <Card>
      <div className="flex items-center gap-3 mb-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-container/15 text-primary-container">
          <User size={22} />
        </div>
        <div>
          <h2 className="font-semibold text-on-surface">Details</h2>
          <p className="text-xs text-on-surface-variant">Manage your personal information</p>
        </div>
      </div>
      <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
        <Input label="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
        <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        {isBrandOwner && (
          <>
            <div className="sm:col-span-2 mt-2 border-t border-outline-variant pt-4">
              <p className="text-sm font-semibold text-on-surface">Branding</p>
              <p className="text-xs text-on-surface-variant">These settings apply to your public and share-link booking pages.</p>
            </div>
            <Input label="Brand display name" value={brandDisplayName} onChange={(e) => setBrandDisplayName(e.target.value)} placeholder="Acme Wellness" />
            <Input label="Logo URL" value={brandLogoUrl} onChange={(e) => setBrandLogoUrl(e.target.value)} placeholder="https://..." />
            <Input label="Primary color" type="color" value={brandPrimaryColor} onChange={(e) => setBrandPrimaryColor(e.target.value)} className="h-10 p-1" />
            <Input label="Accent color" type="color" value={brandAccentColor} onChange={(e) => setBrandAccentColor(e.target.value)} className="h-10 p-1" />
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Theme</span>
              <select
                value={brandTheme}
                onChange={(e) => setBrandTheme(e.target.value)}
                className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm shadow-sm outline-none transition focus:border-primary-container focus:ring-2 focus:ring-primary-container/20"
              >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </label>
            <Input
              label="Custom booking domain (readiness)"
              value={brandBookingDomain}
              onChange={(e) => setBrandBookingDomain(e.target.value)}
              placeholder="book.yourbusiness.com"
            />
          </>
        )}
        <div className="sm:col-span-2 flex items-center gap-3">
          <Button type="submit">Save changes</Button>
          {msg && <p className={`text-sm ${msg.includes("success") ? "text-secondary" : "text-error"}`}>{msg}</p>}
        </div>
      </form>
    </Card>
  );
}
