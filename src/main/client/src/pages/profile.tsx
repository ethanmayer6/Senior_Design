import { useEffect, useState } from "react";
import axios from "axios";
import type { User } from "../types/user";
import { Card } from "primereact/card";
import { InputText } from "primereact/inputtext";
import { InputMask } from "primereact/inputmask";
import { Button } from "primereact/button";
import { Avatar } from "primereact/avatar";

export default function Profile(){
    const [user, setUser] = useState<Partial<User> | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    useEffect(() => {
        if(import.meta.env.DEV && new URLSearchParams(window.location.search).get("mock") === "true"){
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
            try{
                const resp = await axios.get("http://localhost:8080/api/users/me");
                setUser(resp.data);
            }
            catch(err: any){
                setError(
                    err?.response?.data?.message ||
                    "Failed to load profile. Please try again."
                );
            }
            finally{
                setLoading(false);
            }
        };
        fetchProfile();
    }, []);

    const fullName = user ? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() : "";

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
    ) => {
        if (!user) return;
        setUser({ ...user, [e.target.name]: e.target.value } as Partial<User>);
    };

    const handleMaskChange = (e: any, name: string) => {
        if (!user) return;
        setUser({ ...user, [name]: e.value} as Partial<User>);
    };

    const handleSave = async(e: React.FormEvent) => {
        e.preventDefault();
        if(!user) return;
        setError("");
        setSuccess("");
        setSaving(true);

        if(!user.firstName || !user.lastName){
            setError("First and last name are requried.");
            setSaving(false);
            return;
        }

        try{
            const resp = await axios.put("http://localhost:8080/api/users/me", user);
            if(resp.status === 200 || resp.status === 204){
                setSuccess("Profile updated successfully.");
                if(resp.data) setUser(resp.data);
            }
            else{
                setSuccess("Profile saved.");
            }
        }
        catch(err: any){
            setError(
                err?.response?.data?.message || "Failed to save profile. Please try again."
            );
        }
        finally{
            setSaving(false);
        }
    };

    if(loading){
        return(
            <div className="flex h-screen items-center justify-center bg-gray-50">
                <p className="text-gray-600">Loading profile...</p>
            </div>
        );
    }

    if(!user){
        return(
            <div className="flex h-screen items-center justify-center bg-gray-50">
                <div className="text-center">
                    <p className="text-red-600">No profile available.</p>
                    <p className="text-sm text-gray-600">Try logging in again.</p>
                </div>
            </div>
        );
    }

    return(
        <div className="flex h-screen items-center justify-center bg-gray-50">
            <img
                src="/logo.png"
                alt="CourseFlow Logo"
                className="w-[200px] absolute top-2 left-2 object-contain"
            />

            <main className="flex-1">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-1">
                        <Card className="shadow-md">
                            <div className="flex flex-col items-center gap-4 p-4">
                                <Avatar label={user?.firstName?.[0] ?? "U"} size="xlarge" shape="circle" style={{ backgroundColor: "#6b7280", color: "white" }}/>
                                <h2 className="text-xl font-semibold text-gray-800">{fullName}</h2>

                                {/*Badges Placeholder*/}
                                <div className="w-full">
                                    <h3 className="text-sm font-medium text-gray-600 mb-2">Badges</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {/*Here*/}
                                    </div>
                                </div>

                                {/*Progress placeholder*/}
                                <div className="w-full mt-3">
                                    <h3 className="text-sm font-medium text-gray-600 mb-2">Progress</h3>
                                </div>

                                <div className="w-full mt-4">
                                    <h3 className="text-sm font-medium text-gray-600 mb-2">User</h3>
                                    <div className="text-sm text-gray-800"><strong>Name: </strong>{fullName}</div>
                                    <div className="text-sm text-gray-800"><strong>Email: </strong>{user?.email}</div>
                                    <div className="text-sm text-gray-800"><strong>Phone: </strong>{user?.phone}</div>
                                    <div className="text-sm text-gray-800"><strong>Major: </strong>{user?.major}</div>
                                </div>

                                <div className="w-full pt-4">
                                    <Button label="Edit Profile" className="w-full" />
                                </div>
                            </div>
                        </Card>
                    </div>
                </div>
            </main>
        </div>
    );
}