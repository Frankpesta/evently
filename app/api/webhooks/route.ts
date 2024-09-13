import { Webhook } from "svix";
import { headers } from "next/headers";
import { WebhookEvent } from "@clerk/nextjs/server";
import { createUser, deleteUser, updateUser } from "@/lib/actions/user.actions";
import { clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
	const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

	if (!WEBHOOK_SECRET) {
		console.error("WEBHOOK_SECRET is not set");
		return NextResponse.json(
			{ error: "Server configuration error" },
			{ status: 500 }
		);
	}

	const headerPayload = headers();
	const svix_id = headerPayload.get("svix-id");
	const svix_timestamp = headerPayload.get("svix-timestamp");
	const svix_signature = headerPayload.get("svix-signature");

	if (!svix_id || !svix_timestamp || !svix_signature) {
		console.error("Missing svix headers");
		return NextResponse.json(
			{ error: "Missing svix headers" },
			{ status: 400 }
		);
	}

	try {
		const payload = await req.json();
		const body = JSON.stringify(payload);

		const wh = new Webhook(WEBHOOK_SECRET);
		const evt = wh.verify(body, {
			"svix-id": svix_id,
			"svix-timestamp": svix_timestamp,
			"svix-signature": svix_signature,
		}) as WebhookEvent;

		const { id } = evt.data;
		const eventType = evt.type;

		console.log(`Processing ${eventType} event for user ${id}`);

		if (eventType === "user.created") {
			const {
				id,
				email_addresses,
				image_url,
				first_name,
				last_name,
				username,
			} = evt.data;

			const user = {
				clerkId: id,
				email: email_addresses[0].email_address,
				username: username!,
				firstName: first_name,
				lastName: last_name,
				photo: image_url,
			};

			const newUser = await createUser(user);
			console.log("User created in database:", newUser);

			if (newUser) {
				await clerkClient.users.updateUserMetadata(id, {
					publicMetadata: {
						userId: newUser._id,
					},
				});
				console.log("Clerk metadata updated");
			}

			return NextResponse.json({
				message: "User created successfully",
				user: newUser,
			});
		}

		if (eventType === "user.updated") {
			const { id, image_url, first_name, last_name, username } = evt.data;

			const user = {
				firstName: first_name,
				lastName: last_name,
				username: username!,
				photo: image_url,
			};

			const updatedUser = await updateUser(id, user);
			console.log("User updated in database:", updatedUser);

			return NextResponse.json({
				message: "User updated successfully",
				user: updatedUser,
			});
		}

		if (eventType === "user.deleted") {
			const { id } = evt.data;

			const deletedUser = await deleteUser(id!);
			console.log("User deleted from database:", deletedUser);

			return NextResponse.json({
				message: "User deleted successfully",
				user: deletedUser,
			});
		}

		console.log(`Unhandled event type: ${eventType}`);
		return NextResponse.json({ message: "Webhook received" }, { status: 200 });
	} catch (error: any) {
		console.error("Error processing webhook:", error);
		return NextResponse.json(
			{ error: "Error processing webhook", details: error.message },
			{ status: 500 }
		);
	}
}
