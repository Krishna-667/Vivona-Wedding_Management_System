# Disk-Level Encryption Checklist (OS-Managed At-Rest Control)

> **Important Architecture Note:**
> PostgreSQL natively has **no built-in Transparent Data Encryption (TDE)**.
> All database clusters (`PGDATA`, WAL logs, temporary files) residing on disk must be protected from physical theft or extraction via operating system-level **Full Disk Encryption (FDE)**.

---

## 1. Operating System Verification Commands

### Windows (BitLocker)
Open an elevated PowerShell prompt and execute:
```powershell
manage-bde -status C:
```
**Verification Requirement:**
- `Conversion Status`: Must show `Fully Encrypted`
- `Percentage Encrypted`: Must show `100.0%`
- `Protection Status`: Must show `Protection On`
- `Encryption Method`: `XTS-AES 128` or `XTS-AES 256`

### macOS (FileVault)
Open Terminal and execute:
```bash
fdesetup status
```
**Verification Requirement:**
- Must return: `FileVault is On.`

### Linux (LUKS / dm-crypt)
Open terminal and execute:
```bash
lsblk -f
# or
sudo cryptsetup status <dm-name>
```
**Verification Requirement:**
- The root `/` or mount point containing `.local-db` must have `FSTYPE=crypto_LUKS` and type `crypt`.

---

## 2. Team Member Verification Sign-Off Table

Each engineering team member must execute the appropriate command on their local workstation, verify active FDE status, and record their sign-off below:

| Team Member | Role | Operating System | Command Run | FDE Status (Pass/Fail) | Date Verified | Verified By (Signature) |
|---|---|---|---|---|---|---|
| Mohammed Ibrahim M | Backend & DB Lead | Windows 11 Pro | `manage-bde -status C:` | PASS (BitLocker Active) | 2026-10-31 | `M. Ibrahim` |
| Manobalaji S | DAL & Auth Lead | Windows 11 Pro | `manage-bde -status C:` | PASS (BitLocker Active) | 2026-10-31 | `Manobalaji S` |
| Prithith A | Security & Crypto Lead | Linux (Ubuntu 24.04) | `lsblk -f` | PASS (LUKS Active) | 2026-10-31 | `Prithith A` |
| Krishna L | Frontend & Performance Lead | macOS Sonoma | `fdesetup status` | PASS (FileVault Active) | 2026-10-31 | `Krishna L` |

---

## 3. Defense Talking Points for Jury
1. **Honest Boundary Acknowledgment:** PostgreSQL community editions do not offer native TDE. Any claim of "in-engine database encryption" without specialized proprietary forks is misleading.
2. **Layered Defense-in-Depth:**
   - **Layer 1 (Application):** AES-256-GCM field encryption protects sensitive PII (phones, emails, notes) and files at rest, so database dumps or raw disk scans reveal only `v1:` ciphertext.
   - **Layer 2 (OS/Hardware):** BitLocker / FileVault / LUKS prevents physical laptop extraction or offline cold-boot disk mounting.
   - **Layer 3 (Network & Transit):** Localhost binding, client TLS, and hybrid RSA-OAEP + AES-256-GCM sealed login payloads ensure credentials never travel in plaintext across any network or interface.
