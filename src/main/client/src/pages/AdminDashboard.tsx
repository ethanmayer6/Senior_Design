import { useEffect, useRef, useState } from "react";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { Toast } from "primereact/toast";

import { getAllUsers, deleteUser, updateUser, setRole } from "../api/admin";
import type { User } from "../types/user";
import UserForm from "../components/UserForm";
import RoleEditor from "../components/RoleEditor";
import NotFound from "./NotFound";

// ───────────────────────────────
// Wrapper handles admin check only
// ───────────────────────────────
export default function AdminDashboardWrapper() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (!stored) {
      setIsAdmin(false);
      return;
    }

    try {
      const parsed = JSON.parse(stored);
      const role = parsed.user?.role?.replace("ROLE_", "");
      setIsAdmin(role === "ADMIN");
    } catch {
      setIsAdmin(false);
    }
  }, []);

  if (isAdmin === null)
    return (
      <div className="flex h-screen items-center justify-center text-gray-600">
        Loading...
      </div>
    );

  if (!isAdmin) return <NotFound />;

  // ✅ Only render the real dashboard if admin
  return <AdminDashboard />;
}

// ───────────────────────────────
// The actual dashboard (all hooks unconditionally here)
// ───────────────────────────────
function AdminDashboard() {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editVisible, setEditVisible] = useState(false);
  const [roleVisible, setRoleVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const toast = useRef<Toast>(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await getAllUsers();
      const array = Array.isArray(res.data)
        ? res.data
        : res.data.data || res.data.users || [];
      setUsers(array);
    } catch (err) {
      console.error("❌ Failed to fetch users:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleDelete = async (user: User) => {
    try {
      await deleteUser(user.id!);
      toast.current?.show({
        severity: "success",
        summary: "Deleted",
        detail: `${user.firstName} removed`,
      });
      fetchUsers();
    } catch {
      toast.current?.show({
        severity: "error",
        summary: "Error",
        detail: "Delete failed",
      });
    }
  };

  return (
    <div className="p-8">
      <Toast ref={toast} />
      <h1 className="text-3xl font-bold mb-6 text-gray-800">Admin Dashboard</h1>

      <DataTable
        value={users}
        paginator
        rows={10}
        loading={loading}
        selectionMode="single"
        selection={selectedUser || undefined}
        onSelectionChange={(e) => setSelectedUser(e.value as User)}
        dataKey="id"
        className="shadow-md rounded-lg"
      >
        <Column field="id" header="ID" sortable />
        <Column field="firstName" header="First Name" sortable />
        <Column field="lastName" header="Last Name" sortable />
        <Column field="email" header="Email" sortable />
        <Column field="role" header="Role" sortable />
        <Column
          header="Actions"
          body={(rowData: User) => (
            <div className="flex gap-2">
              <Button
                icon="pi pi-pencil"
                className="p-button-rounded p-button-sm"
                onClick={() => {
                  setSelectedUser(rowData);
                  setEditVisible(true);
                }}
              />
              <Button
                icon="pi pi-user-edit"
                className="p-button-rounded p-button-secondary p-button-sm"
                onClick={() => {
                  setSelectedUser(rowData);
                  setRoleVisible(true);
                }}
              />
              <Button
                icon="pi pi-trash"
                className="p-button-rounded p-button-danger p-button-sm"
                onClick={() => handleDelete(rowData)}
              />
            </div>
          )}
        />
      </DataTable>

      {/* Edit Dialog */}
      <Dialog
        header="Edit User"
        visible={editVisible}
        onHide={() => setEditVisible(false)}
        style={{ width: "30rem" }}
      >
        {selectedUser && (
          <UserForm
            user={selectedUser}
            onSave={async (data) => {
              await updateUser({ ...data, id: selectedUser.id });
              setEditVisible(false);
              fetchUsers();
              toast.current?.show({
                severity: "success",
                summary: "Updated",
                detail: "User updated",
              });
            }}
          />
        )}
      </Dialog>

      {/* Role Dialog */}
      <Dialog
        header="Edit Role"
        visible={roleVisible}
        onHide={() => setRoleVisible(false)}
        style={{ width: "25rem" }}
      >
        {selectedUser && (
          <RoleEditor
            user={selectedUser}
            onSave={async (role) => {
              await setRole({ id: selectedUser.id, role });
              setRoleVisible(false);
              fetchUsers();
              toast.current?.show({
                severity: "success",
                summary: "Updated",
                detail: "Role changed",
              });
            }}
          />
        )}
      </Dialog>
    </div>
  );
}