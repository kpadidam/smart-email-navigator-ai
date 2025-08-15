-- CreateEnum
CREATE TYPE "public"."Role" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "public"."Provider" AS ENUM ('GMAIL', 'OUTLOOK', 'YAHOO');

-- CreateEnum
CREATE TYPE "public"."Category" AS ENUM ('MEETINGS', 'DELIVERY', 'INTERVIEWS', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."Priority" AS ENUM ('HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "public"."Sentiment" AS ENUM ('POSITIVE', 'NEUTRAL', 'NEGATIVE');

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "firstName" VARCHAR(50) NOT NULL,
    "lastName" VARCHAR(50) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "name" VARCHAR(100),
    "picture" TEXT,
    "googleId" TEXT,
    "password" TEXT,
    "role" "public"."Role" NOT NULL DEFAULT 'USER',
    "isEmailVerified" BOOLEAN NOT NULL DEFAULT false,
    "emailVerificationToken" TEXT,
    "passwordResetToken" TEXT,
    "passwordResetExpires" TIMESTAMP(3),
    "gmailTokens" JSONB,
    "gmailConnected" BOOLEAN NOT NULL DEFAULT false,
    "gmailConnectedAt" TIMESTAMP(3),
    "lastLogin" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."EmailAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "provider" "public"."Provider" NOT NULL DEFAULT 'GMAIL',
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "tokenExpiry" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastSyncAt" TIMESTAMP(3),
    "syncSettings" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Email" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "emailAccountId" TEXT,
    "gmailId" TEXT NOT NULL,
    "messageId" TEXT,
    "threadId" TEXT,
    "subject" TEXT NOT NULL,
    "fromName" TEXT,
    "fromEmail" TEXT NOT NULL,
    "to" JSONB NOT NULL,
    "cc" JSONB,
    "bcc" JSONB,
    "bodyText" TEXT,
    "bodyHtml" TEXT,
    "attachments" JSONB,
    "labels" TEXT[],
    "labelIds" TEXT[],
    "snippet" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "isStarred" BOOLEAN NOT NULL DEFAULT false,
    "isImportant" BOOLEAN NOT NULL DEFAULT false,
    "receivedAt" TIMESTAMP(3) NOT NULL,
    "aiCategory" "public"."Category",
    "aiPriority" "public"."Priority",
    "aiSentiment" "public"."Sentiment",
    "aiSummary" TEXT,
    "aiActionItems" TEXT[],
    "aiConfidence" DOUBLE PRECISION,
    "aiProcessedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Email_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_googleId_key" ON "public"."User"("googleId");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "public"."User"("email");

-- CreateIndex
CREATE INDEX "User_isActive_idx" ON "public"."User"("isActive");

-- CreateIndex
CREATE INDEX "EmailAccount_userId_isActive_idx" ON "public"."EmailAccount"("userId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "EmailAccount_userId_email_key" ON "public"."EmailAccount"("userId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "Email_gmailId_key" ON "public"."Email"("gmailId");

-- CreateIndex
CREATE UNIQUE INDEX "Email_messageId_key" ON "public"."Email"("messageId");

-- CreateIndex
CREATE INDEX "Email_userId_receivedAt_idx" ON "public"."Email"("userId", "receivedAt" DESC);

-- CreateIndex
CREATE INDEX "Email_emailAccountId_receivedAt_idx" ON "public"."Email"("emailAccountId", "receivedAt" DESC);

-- CreateIndex
CREATE INDEX "Email_userId_accountId_receivedAt_idx" ON "public"."Email"("userId", "accountId", "receivedAt" DESC);

-- CreateIndex
CREATE INDEX "Email_userId_gmailId_idx" ON "public"."Email"("userId", "gmailId");

-- CreateIndex
CREATE INDEX "Email_fromEmail_idx" ON "public"."Email"("fromEmail");

-- CreateIndex
CREATE INDEX "Email_aiCategory_idx" ON "public"."Email"("aiCategory");

-- CreateIndex
CREATE INDEX "Email_aiPriority_idx" ON "public"."Email"("aiPriority");

-- AddForeignKey
ALTER TABLE "public"."EmailAccount" ADD CONSTRAINT "EmailAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Email" ADD CONSTRAINT "Email_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Email" ADD CONSTRAINT "Email_emailAccountId_fkey" FOREIGN KEY ("emailAccountId") REFERENCES "public"."EmailAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
