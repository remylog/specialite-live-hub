-- DropForeignKey
ALTER TABLE "SubscriberHistory" DROP CONSTRAINT "SubscriberHistory_channelId_fkey";

-- AlterTable
ALTER TABLE "Channel" DROP COLUMN "subscriberCount";

-- DropTable
DROP TABLE "SubscriberHistory";

