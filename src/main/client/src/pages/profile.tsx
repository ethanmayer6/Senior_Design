import { useEffect, useState } from "react";
import axios from "axios";
import Header from "../components/Header.tsx";
import type { User } from "../types/user";
import { Card } from "primereact/card";
import { InputText } from "primereact/inputtext";
import { InputMask } from "primereact/inputmask";
import { Button } from "primereact/button";
import { Avatar } from "primereact/avatar";
import { Dialog } from "primereact/dialog";
import { Divider } from "primereact/divider";

export default function Profile() {
  const [user, setUser] = useState<Partial<User> | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [editVisible, setEditVisible] = useState(false);
  const [editSection, setEditSection] = useState<
    "none" | "contact" | "profile"
  >("none");

  const [form, setForm] = useState<Partial<User>>({});

  const mockBadges = ["Beginner", "Contributor", "Beta Tester"];
  const mockProgress = [
    { id: 1, label: "Intro to Programming", value: 80 },
    { id: 2, label: "Data Structures", value: 50 },
    { id: 3, label: "Algorithms", value: 30 },
  ];

  useEffect(() => {
    if (
      import.meta.env.DEV &&
      new URLSearchParams(window.location.search).get("mock") === "true"
    ) {
      setUser({
        id: 1,
        role: "student",
        firstName: "Dev",
        lastName: "User",
        email: "dev.user@example.com",
        phone: "(555) 123-4567",
        major: "Computer Science",
      });
      setLoading(false);
      return;
    }

    const fetchProfile = async () => {
      setLoading(true);
      setError("");
      try {
        const token = localStorage.getItem("token");
        const resp = await axios.get("http://localhost:8080/api/users/me", {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        setUser(resp.data);
      } catch (err: any) {
        setError(
          err?.response?.data?.message ||
            "Failed to load profile. Please try again."
        );
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const fullName = user
    ? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim()
    : "";

  // const openEdit = (section: "contact" | "profile") => {
  //     setForm({
  //         ...(section === "contact"
  //             ? { phone: user?.phone, email: user?.email }
  //             : { firstName: user?.firstName, lastName: user?.lastName, major: user?.major }),
  //     });
  //     setEditSection(section);
  //     setEditVisible(true);
  //     setError("");
  //     setSuccess("");
  // };

  const closeEdit = () => {
    setEditVisible(false);
    setEditSection("none");
    setForm({});
  };

  const onFormChange = (key: keyof User, value: any) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  const buildUpdates = () => {
    if (!user) return {};
    const updates: Partial<User> = {};
    Object.entries(form).forEach(([k, v]) => {
      const key = k as keyof User;
      const current = user[key];
      if (v !== undefined && v !== null && String(v) !== String(current)) {
        updates[key] = v as any;
      }
    });
    return updates;
  };

  const handleSave = async () => {
    if (!user) return;

    //Email & Phone validation
    if (editSection === "contact") {
      //Email regex
      const email = form.email ?? "";
      const emailRegex = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;
      if (!emailRegex.test(email)) {
        setError("Please enter a valid email address.");
        return;
      }

      //Phone regex
      const phone = form.phone ?? "";
      const phoneRegex = /^\(\d{3}\) \d{3}-\d{4}$/;
      if (!phoneRegex.test(phone)) {
        setError(
          "Please enter a valid phone number in the format (123) 456-7890."
        );
        return;
      }
    }

    const updates = buildUpdates();
    if (Object.keys(updates).length === 0) {
      setError("No changes to save.");
      return;
    }
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const token = localStorage.getItem("token");
      const resp = await axios.put(
        "http://localhost:8080/api/users/me",
        updates,
        {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        }
      );
      if (resp.status === 200) {
        setUser((u) => ({ ...(u ?? {}), ...updates }));
        setSuccess("Profile updated.");
        closeEdit();
      } else if (resp.data) {
        setUser(resp.data);
        setSuccess("Profile updated.");
        closeEdit();
      } else {
        setSuccess("Profile updated.");
        closeEdit();
      }
    } catch (err: any) {
      setError(
        err?.response?.data?.message || "Failed to update profile. Try again."
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <p className="text-gray-600">Loading profile...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-red-600">No profile available.</p>
          <p className="text-sm text-gray-600">Try logging in again.</p>
        </div>
      </div>
    );
  }

  const formatPhone = (phone?: string | null) => {
    if (!phone) return "";
    const digits = phone.replace(/\D/g, "");
    if (digits.length === 10) {
      const a = digits.slice(0, 3);
      const b = digits.slice(3, 6);
      const c = digits.slice(6, 10);
      return `(${a}) ${b}-${c}`;
    }
    return phone;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="pt-24 flex items-center justify-center min-h-[calc(100vh-5rem)]">
        <div className="w-full max-w-md px-4">
          <Card className="shadow-md">
            <div className="flex flex-col items-center gap-4 p-4">
              <Avatar
                label={user?.firstName?.[0] ?? "U"}
                size="xlarge"
                shape="circle"
                style={{ backgroundColor: "#6b7280", color: "white" }}
              />
              <h2 className="text-xl font-semibold text-gray-800">
                {fullName}
              </h2>

              {/*Badges Placeholder*/}
              <div className="w-full">
                <h3 className="text-sm font-medium text-gray-600 mb-2">
                  Badges
                </h3>
                <div className="overflow-x-auto">
                  <div className="flex gap-3 py-2">
                    {mockBadges.map((b, idx) => (
                      <div
                        key={idx}
                        className="min-w-[120px] flex-shrink-0 bg-white border rounded-md shadow-sm px-3 py-3 flex flex-col items-center justify-center"
                        role="group"
                        aria-label={`Badge ${b}`}
                      >
                        <div className="text-sm font-semibold text-gray-700">
                          {b}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">Earned</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/*Progress placeholder*/}
              <div className="w-full mt-3">
                <h3 className="text-sm font-medium text-gray-600 mb-2">
                  Progress
                </h3>
                <div className="max-h-44 overflow-y-auto space-y-3 pr-2">
                  {mockProgress.map((p) => (
                    <div
                      key={p.id}
                      className="bg-white border rounded-md shadow-sm p-3"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-sm font-medium text-gray-700">
                          {p.label}
                        </div>
                        <div className="text-xs text-gray-500">{p.value}%</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/*User Info*/}
              <div className="w-full mt-4">
                <h3 className="text-sm font-medium text-gray-600 mb-2">User</h3>
                <div className="text-sm text-gray-800">
                  <strong>Name: </strong>
                  {fullName}
                </div>
                <div className="text-sm text-gray-800">
                  <strong>Email: </strong>
                  {user?.email}
                </div>
                <div className="text-sm text-gray-800">
                  <strong>Phone: </strong>
                  {formatPhone(user?.phone)}
                </div>
                <div className="text-sm text-gray-800">
                  <strong>Major: </strong>
                  {user?.major}
                </div>
              </div>

              <div className="w-full pt-4">
                <Button
                  label="Edit Profile"
                  className="w-full p-button-danger"
                  onClick={() => {
                    setEditSection("none");
                    setEditVisible(true);
                    setError("");
                    setSuccess("");
                  }}
                />
              </div>
            </div>
          </Card>
        </div>
      </main>

      {/*Edit Dialog*/}
      <Dialog
        header="Edit Profile"
        visible={editVisible}
        style={{ width: "420px" }}
        onHide={closeEdit}
        modal
      >
        <div>
          {/*Section selector*/}
          {editSection === "none" && (
            <div className="flex flex-col gap-3">
              <Button
                label="Contact Info"
                onClick={() => setEditSection("contact")}
              />
              <Button
                label="Profile Info"
                onClick={() => setEditSection("profile")}
              />
            </div>
          )}

          {/*Contact Info Form*/}
          {editSection === "contact" && (
            <div className="flex flex-col gap-3">
              <label className="text-sm text-gray-600">Email</label>
              <InputText
                value={form.email ?? ""}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  onFormChange("email", e.target.value)
                }
              />
              <label className="text-sm text-gray-600">Phone</label>
              <InputMask
                mask="(999) 999-9999"
                value={form.phone ?? ""}
                onChange={(e: any) => onFormChange("phone", e.value ?? "")}
              />
              <Divider />
              <div className="flex justify-end gap-2">
                <Button
                  label="Cancel"
                  className="p-button-secondary"
                  onClick={closeEdit}
                />
                <Button
                  label={saving ? "Saving..." : "Save"}
                  onClick={handleSave}
                />
              </div>
            </div>
          )}

          {/*Profile Info Form*/}
          {editSection === "profile" && (
            <div className="flex flex-col gap-3">
              <label className="text-sm text-gray-600">First Name</label>
              <InputText
                value={form.firstName ?? ""}
                onChange={(e) => onFormChange("firstName", e.target.value)}
              />
              <label className="text-sm text-gray-600">Last Name</label>
              <InputText
                value={form.lastName ?? ""}
                onChange={(e) => onFormChange("lastName", e.target.value)}
              />
              <label className="text-sm text-gray-600">Major</label>
              <InputText
                value={form.major ?? ""}
                onChange={(e) => onFormChange("major", e.target.value)}
              />
              <Divider />
              <div className="flex justify-end gap-2">
                <Button
                  label="Cancel"
                  className="p-button-secondary"
                  onClick={closeEdit}
                />
                <Button
                  label={saving ? "Saving..." : "Save"}
                  onClick={handleSave}
                />
              </div>
            </div>
          )}
        </div>

        {error && <div className="text-red-600 mt-3">{error}</div>}
        {success && <div className="text-green-600 mt-3">{success}</div>}
      </Dialog>
    </div>
  );
}
