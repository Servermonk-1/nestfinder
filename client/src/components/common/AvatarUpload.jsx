import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Camera, Loader2 } from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { getImageUrl } from '../../utils/urlHelper';

const SIZES = {
	sm: 'h-12 w-12 text-lg',
	md: 'h-16 w-16 text-2xl',
	lg: 'h-20 w-20 text-3xl',
};

export default function AvatarUpload({ size = 'md' }) {
	const { user, updateUser } = useAuth();
	const [pic, setPic] = useState(user?.profilePicture || null);
	const [uploading, setUploading] = useState(false);
	const inputRef = useRef(null);

	// Pull the freshest profile (photo + verified status) from the server.
	useEffect(() => {
		api.get('/profile/me')
			.then(({ data }) => {
				setPic(data.user.profilePicture || null);
				updateUser({
					profilePicture: data.user.profilePicture,
					verified: data.user.verified,
					emailVerified: data.user.emailVerified,
				});
			})
			.catch(() => { /* keep whatever we have */ });
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const handleFile = async (file) => {
		if (!file) return;
		setUploading(true);
		try {
			const fd = new FormData();
			fd.append('avatar', file);
			const { data } = await api.post('/profile/avatar', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
			setPic(data.profilePicture);
			updateUser({ profilePicture: data.profilePicture });
			toast.success('Profile photo updated');
		} catch (err) {
			toast.error(err.response?.data?.message || 'Upload failed');
		} finally {
			setUploading(false);
		}
	};

	return (
		<div className="relative shrink-0">
			<input ref={inputRef} type="file" accept="image/png,image/jpeg,image/jpg,image/webp" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
			<button
				type="button"
				onClick={() => inputRef.current?.click()}
				title="Change profile photo"
				className={`group relative ${SIZES[size]} overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-highlight font-serif font-bold text-base flex items-center justify-center`}
			>
				{pic
					? <img src={getImageUrl(pic)} alt="Profile" className="h-full w-full object-cover" />
					: <span>{user?.fullName?.charAt(0).toUpperCase() || '?'}</span>}
				<span className="absolute inset-0 flex items-center justify-center bg-base/55 opacity-0 transition group-hover:opacity-100">
					{uploading ? <Loader2 className="h-5 w-5 animate-spin text-text" /> : <Camera className="h-5 w-5 text-text" />}
				</span>
			</button>
		</div>
	);
}
