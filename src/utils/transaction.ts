import mongoose from 'mongoose';

export class TransactionHelper {

    static async supportsTransactions(): Promise<boolean> {
        try {
            const admin = mongoose.connection.db?.admin();
            if (!admin) return false;

            const info = await admin.serverInfo();

            const isMaster = await admin.command({ isMaster: 1 });
            return !!(isMaster.setName || isMaster.msg === 'isdbgrid');
        } catch (error) {
            return false;
        }
    }


    static async withTransaction<T>(
        operation: (session: mongoose.ClientSession | null) => Promise<T>
    ): Promise<T> {
        const supportsTransactions = await this.supportsTransactions();

        if (supportsTransactions) {
            const session = await mongoose.startSession();
            session.startTransaction();

            try {
                const result = await operation(session);
                await session.commitTransaction();
                return result;
            } catch (error) {
                await session.abortTransaction();
                throw error;
            } finally {
                session.endSession();
            }
        } else {
            return await operation(null);
        }
    }
}