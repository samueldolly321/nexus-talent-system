using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;

namespace NexusTalentSystem.Infrastructure.Persistence
{
    // ==========================================
    // ENTITY FRAMEWORK CORE MULTI-TENANT CONTEXT
    // ==========================================
    public class NexusTalentDbContext : DbContext
    {
        private readonly string _tenantId; // Injected from CurrentTenantService (JWT claims)

        public NexusTalentDbContext(DbContextOptions<NexusTalentDbContext> options, string tenantId) 
            : base(options)
        {
            _tenantId = tenantId;
        }

        // DbSets corresponding to PostgreSQL tables
        public DbSet<Company> Companies { get; set; }
        public DbSet<User> Users { get; set; }
        public DbSet<Role> Roles { get; set; }
        public DbSet<Job> Jobs { get; set; }
        public DbSet<JobSkill> JobSkills { get; set; }
        public DbSet<Candidate> Candidates { get; set; }
        public DbSet<CandidateFile> CandidateFiles { get; set; }
        public DbSet<CandidateExperience> CandidateExperiences { get; set; }
        public DbSet<CandidateEducation> CandidateEducations { get; set; }
        public DbSet<CandidateSkill> CandidateSkills { get; set; }
        public DbSet<CandidateLanguage> CandidateLanguages { get; set; }
        public DbSet<CandidateAnalysis> CandidateAnalyses { get; set; }
        public DbSet<CandidateScore> CandidateScores { get; set; }
        public DbSet<CandidateRecommendation> CandidateRecommendations { get; set; }
        public DbSet<CandidatePipeline> CandidatePipelines { get; set; }
        public DbSet<EmailInboxItem> Emails { get; set; }
        public DbSet<AuditLog> AuditLogs { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // 1. Primary & Foreign Keys mapping
            modelBuilder.Entity<JobSkill>().HasKey(js => new { js.JobId, js.SkillName });
            modelBuilder.Entity<CandidateSkill>().HasKey(cs => new { cs.CandidateId, cs.SkillName });
            modelBuilder.Entity<CandidateLanguage>().HasKey(cl => new { cl.CandidateId, cl.LanguageCode });

            // 2. Global Query Filter for Multi-Tenant Data Isolation
            // Ensures that no company can ever query or modify data belonging to another tenant!
            modelBuilder.Entity<User>().HasQueryFilter(u => u.CompanyId == _tenantId);
            modelBuilder.Entity<Job>().HasQueryFilter(j => j.CompanyId == _tenantId);
            modelBuilder.Entity<Candidate>().HasQueryFilter(c => c.CompanyId == _tenantId);
            modelBuilder.Entity<EmailInboxItem>().HasQueryFilter(e => e.CompanyId == _tenantId);
            modelBuilder.Entity<AuditLog>().HasQueryFilter(a => a.CompanyId == _tenantId);

            // 3. PostgreSQL Performance Indexing
            modelBuilder.Entity<Candidate>().HasIndex(c => new { c.CompanyId, c.JobId, c.Stage });
            modelBuilder.Entity<CandidateSkill>().HasIndex(cs => new { cs.SkillName, cs.CandidateId });
            modelBuilder.Entity<AuditLog>().HasIndex(a => new { a.CompanyId, a.Timestamp });

            // 4. Set precision/types for postgres
            modelBuilder.Entity<Job>().Property(j => j.SalaryRange).HasColumnType("varchar(100)");
        }

        public override int SaveChanges()
        {
            ApplyMultiTenantAndAuditing();
            return base.SaveChanges();
        }

        public override Task<int> SaveChangesAsync(System.Threading.CancellationToken cancellationToken = default)
        {
            ApplyMultiTenantAndAuditing();
            return base.SaveChangesAsync(cancellationToken);
        }

        private void ApplyMultiTenantAndAuditing()
        {
            foreach (var entry in ChangeTracker.Entries())
            {
                // Auto-inject tenantId for new multi-tenant entities
                if (entry.State == EntityState.Added && entry.Entity is IMultiTenant entity)
                {
                    entity.CompanyId = _tenantId;
                }

                // Auto-timestamp
                if (entry.Entity is IAuditable auditable)
                {
                    if (entry.State == EntityState.Added)
                    {
                        auditable.CreatedAt = DateTime.UtcNow;
                    }
                    else if (entry.State == EntityState.Modified)
                    {
                        auditable.UpdatedAt = DateTime.UtcNow;
                    }
                }
            }
        }
    }

    // ==========================================
    // MULTI-TENANCY & AUDIT CONTRACTS
    // ==========================================
    public interface IMultiTenant
    {
        string CompanyId { get; set; }
    }

    public interface IAuditable
    {
        DateTime CreatedAt { get; set; }
        DateTime? UpdatedAt { get; set; }
    }

    // ==========================================
    // DOMAIN ENTITIES (POSTGRES SCHEMAS)
    // ==========================================

    [Table("companies")]
    public class Company
    {
        [Key]
        public string Id { get; set; } = Guid.NewGuid().ToString();
        [Required, MaxLength(150)]
        public string Name { get; set; }
        [Required, MaxLength(100)]
        public string Domain { get; set; }
        public string LogoUrl { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }

    [Table("users")]
    public class User : IMultiTenant
    {
        [Key]
        public string Id { get; set; } = Guid.NewGuid().ToString();
        [Required]
        public string CompanyId { get; set; }
        [Required, MaxLength(100)]
        public string Name { get; set; }
        [Required, EmailAddress]
        public string Email { get; set; }
        [Required]
        public string RoleName { get; set; }
        public string PasswordHash { get; set; }
        public string RefreshToken { get; set; }
        public DateTime? RefreshTokenExpiryTime { get; set; }
    }

    [Table("roles")]
    public class Role
    {
        [Key]
        public string Name { get; set; } // rh, admin_entreprise, admin_plateforme, etc.
        public string Description { get; set; }
    }

    [Table("jobs")]
    public class Job : IMultiTenant, IAuditable
    {
        [Key]
        public string Id { get; set; } = Guid.NewGuid().ToString();
        [Required]
        public string CompanyId { get; set; }
        [Required, MaxLength(200)]
        public string Title { get; set; }
        [Required]
        public string Description { get; set; }
        public string EducationRequired { get; set; }
        public int MinExperienceYears { get; set; }
        public string SalaryRange { get; set; }
        public string Location { get; set; }
        public string ContractType { get; set; } // CDI, CDD, Freelance, etc.
        public string Status { get; set; } // Active, Archived, Draft
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
    }

    [Table("job_skills")]
    public class JobSkill
    {
        public string JobId { get; set; }
        public string SkillName { get; set; }
        public bool IsRequired { get; set; } = true;
    }

    [Table("candidates")]
    public class Candidate : IMultiTenant, IAuditable
    {
        [Key]
        public string Id { get; set; } = Guid.NewGuid().ToString();
        [Required]
        public string CompanyId { get; set; }
        [Required]
        public string JobId { get; set; }
        [Required, MaxLength(150)]
        public string Name { get; set; }
        [Required, EmailAddress]
        public string Email { get; set; }
        public string Phone { get; set; }
        public string Location { get; set; }
        public string LinkedinUrl { get; set; }
        [Required]
        public string Stage { get; set; } // Reçu, Analysé, Entretien RH, Test technique, etc.
        public string CvText { get; set; }
        public string LetterText { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
    }

    [Table("candidate_files")]
    public class CandidateFile
    {
        [Key]
        public string Id { get; set; } = Guid.NewGuid().ToString();
        [Required]
        public string CandidateId { get; set; }
        [Required]
        public string FileName { get; set; }
        [Required]
        public string FileType { get; set; } // Resume, CoverLetter, Attachment
        [Required]
        public byte[] FileData { get; set; }
        public DateTime UploadedAt { get; set; } = DateTime.UtcNow;
    }

    [Table("candidate_experiences")]
    public class CandidateExperience
    {
        [Key]
        public string Id { get; set; } = Guid.NewGuid().ToString();
        [Required]
        public string CandidateId { get; set; }
        public int Years { get; set; }
        public string Company { get; set; }
        public string Role { get; set; }
        public string Description { get; set; }
    }

    [Table("candidate_educations")]
    public class CandidateEducation
    {
        [Key]
        public string Id { get; set; } = Guid.NewGuid().ToString();
        [Required]
        public string CandidateId { get; set; }
        public string Degree { get; set; }
        public string School { get; set; }
        public string Year { get; set; }
    }

    [Table("candidate_skills")]
    public class CandidateSkill
    {
        public string CandidateId { get; set; }
        public string SkillName { get; set; }
        public string Category { get; set; } // Language, Framework, Database, Tool, Cloud, SoftSkill
    }

    [Table("candidate_languages")]
    public class CandidateLanguage
    {
        public string CandidateId { get; set; }
        public string LanguageCode { get; set; } // FR, EN, ES, etc.
        public string Proficiency { get; set; } // Maternelle, Courant, Intermédiaire, Débutant
    }

    [Table("candidate_analysis")]
    public class CandidateAnalysis
    {
        [Key, ForeignKey("Candidate")]
        public string CandidateId { get; set; }
        public string AutoSummary { get; set; }
        public int YearsOfExperienceCalculated { get; set; }
        public DateTime AnalyzedAt { get; set; } = DateTime.UtcNow;
    }

    [Table("candidate_scores")]
    public class CandidateScore
    {
        [Key, ForeignKey("Candidate")]
        public string CandidateId { get; set; }
        public int SkillsScore { get; set; }
        public int ExperienceScore { get; set; }
        public int EducationScore { get; set; }
        public int SoftSkillsScore { get; set; }
        public int LanguagesScore { get; set; }
        public int GlobalScore { get; set; }
    }

    [Table("candidate_recommendations")]
    public class CandidateRecommendation
    {
        [Key, ForeignKey("Candidate")]
        public string CandidateId { get; set; }
        public string RecommendationSummary { get; set; }
        public string StrengthsJson { get; set; } // Serialized list
        public string WeaknessesJson { get; set; } // Serialized list
        public string AttentionPointsJson { get; set; } // Serialized list
        public string CompatibilityExplanation { get; set; }
        public string SuggestedDecision { get; set; } // Entretien, Réserve, Rejet
    }

    [Table("candidate_pipeline")]
    public class CandidatePipeline : IMultiTenant
    {
        [Key]
        public string Id { get; set; } = Guid.NewGuid().ToString();
        [Required]
        public string CompanyId { get; set; }
        [Required]
        public string CandidateId { get; set; }
        public string FromStage { get; set; }
        public string ToStage { get; set; }
        public string Comment { get; set; }
        public DateTime ChangedAt { get; set; } = DateTime.UtcNow;
        public string ChangedByUserId { get; set; }
    }

    [Table("emails_inbox_items")]
    public class EmailInboxItem : IMultiTenant
    {
        [Key]
        public string Id { get; set; } = Guid.NewGuid().ToString();
        [Required]
        public string CompanyId { get; set; }
        public string FromEmail { get; set; }
        public string Subject { get; set; }
        public string Body { get; set; }
        public string AttachmentName { get; set; }
        public string AttachmentContent { get; set; }
        public string Status { get; set; } // Pending, Imported, Ignored
        public DateTime ReceivedAt { get; set; } = DateTime.UtcNow;
    }

    [Table("audit_logs")]
    public class AuditLog : IMultiTenant
    {
        [Key]
        public string Id { get; set; } = Guid.NewGuid().ToString();
        [Required]
        public string CompanyId { get; set; }
        [Required]
        public string UserId { get; set; }
        public string UserName { get; set; }
        public string UserRole { get; set; }
        public string Action { get; set; }
        public string Details { get; set; }
        public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    }
}
