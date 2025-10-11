import { getServerSession } from "next-auth";
import { options } from "@/app/api/auth/[...nextauth]/options";
import ProfileForm from "./clientComponents/ProfileForm";

const ProfilePage = async () => {
  const session = await getServerSession(options);

  if (!session || !session.user) {
    return <div>Not authorized</div>;
  }

  return <ProfileForm user={session.user} />;
};

export default ProfilePage;
