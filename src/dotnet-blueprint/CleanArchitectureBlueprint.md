# Blueprint d'Architecture : Nexus Talent System (ASP.NET Core & PostgreSQL)

Ce document présente l'architecture de production SaaS Multi-Tenant pour le backend du **Nexus Talent System**. Il s'appuie sur la **Clean Architecture**, le pattern **CQRS (MediatR)**, **Entity Framework Core (PostgreSQL)**, et l'intégration de l'**API OpenAI** pour l'extraction sémantique et le scoring.

---

## 1. Structure de la Solution .NET (Clean Architecture)

```text
NexusTalentSystem/
│
├── NexusTalentSystem.Domain/                 # Logique métier pure (indépendante de tout framework)
│   ├── Entities/                             # Company.cs, User.cs, Candidate.cs, Job.cs
│   ├── Enums/                                # UserRole.cs, PipelineStage.cs, ContractType.cs
│   ├── ValueObjects/                         # EmailAddress.cs, PhoneNumber.cs
│   └── Exceptions/                           # DomainException.cs, TenantMismatchException.cs
│
├── NexusTalentSystem.Application/            # Cas d'utilisation & Interfaces (Application Core)
│   ├── Common/
│   │   ├── Interfaces/                       # INexusTalentDbContext.cs, ITenantService.cs, IAiService.cs
│   │   ├── Behaviors/                        # ValidationBehavior.cs, LoggingBehavior.cs, TransactionBehavior.cs
│   │   └── Security/                         # AuthorizeAttribute.cs
│   ├── Jobs/
│   │   ├── Commands/                         # CreateJobCommand.cs, EditJobCommand.cs
│   │   └── Queries/                          # GetActiveJobsQuery.cs
│   ├── Candidates/
│   │   ├── Commands/                         # AnalyzeCandidateWithAiCommand.cs, UpdateStageCommand.cs
│   │   ├── Queries/                          # SearchCandidatesAiQuery.cs
│   │   └── Validators/                       # CreateCandidateCommandValidator.cs (FluentValidation)
│   └── Dtos/                                 # CandidateDto.cs, JobDto.cs, AnalysisResultDto.cs
│
├── NexusTalentSystem.Infrastructure/          # Implémentation des interfaces (Accès Données & Externe)
│   ├── Persistence/
│   │   ├── NexusTalentDbContext.cs           # EF Core PostgreSQL DbContext (Filtre Multi-Tenant)
│   │   ├── Migrations/                       # Migrations EF Core de production
│   │   └── Repositories/                     # UnitOfWork.cs, CandidateRepository.cs
│   ├── Identity/
│   │   ├── IdentityService.cs                # Gestion des mots de passe & JWT Tokens
│   │   └── JwtTokenGenerator.cs              # Création des JWT & Refresh Tokens
│   └── Services/
│       ├── TenantService.cs                  # Détermination du Tenant (via HttpContext.User.Claims)
│       └── OpenAIParserService.cs            # Moteur NLP (Chat Completion avec JSON Schema)
│
└── NexusTalentSystem.Api/                     # Point d'entrée (Host Web API REST)
    ├── Controllers/
    │   ├── BaseApiController.cs              # Contrôleur générique sécurisé
    │   ├── CandidateController.cs            # Routes candidats & scoring
    │   └── JobController.cs                  # Routes gestion des offres
    ├── Middleware/
    │   ├── ExceptionHandlingMiddleware.cs   # Interception globale des erreurs (Format RFC 7807)
    │   └── TenantIdentifierMiddleware.cs     # Injection du X-Tenant-ID ou Extraction JWT
    ├── Program.cs                            # Configuration de l'injection de dépendances, Kestrel & Swagger
    └── appsettings.json                      # Chaînes de connexion PostgreSQL et clés API
```

---

## 2. Règle de Sécurité Critique : Isolation des Données (Multi-Tenancy)

Dans un SaaS multi-tenant commercialisable, **aucune donnée d'un tenant ne doit fuiter vers un autre**.
L'implémentation repose sur :
1. **Filtre de Requête Global (Global Query Filter)** dans Entity Framework Core :
   ```csharp
   modelBuilder.Entity<Candidate>().HasQueryFilter(c => c.CompanyId == _tenantId);
   ```
2. **Middleware d'Authentification** : Durant l'authentification (JWT), le claim `companyId` est extrait du token et injecté dans un service scopé `ITenantService`. Ce service fournit le `_tenantId` au DbContext de manière sécurisée lors de chaque requête HTTP.

---

## 3. Validation des Données (FluentValidation)

Les données entrantes sont systématiquement validées avant l'exécution du cas d'utilisation (Command/Query) grâce à des validateurs FluentValidation greffés dans le pipeline MediatR :

```csharp
using FluentValidation;

namespace NexusTalentSystem.Application.Candidates.Validators
{
    public class CreateCandidateCommandValidator : AbstractValidator<CreateCandidateCommand>
    {
        public CreateCandidateCommandValidator()
        {
            RuleFor(v => v.Name)
                .NotEmpty().WithMessage("Le nom du candidat est requis.")
                .MaximumLength(150).WithMessage("Le nom ne doit pas dépasser 150 caractères.");

            RuleFor(v => v.Email)
                .NotEmpty().WithMessage("L'adresse email est requise.")
                .EmailAddress().WithMessage("L'adresse email doit être valide.");

            RuleFor(v => v.JobId)
                .NotEmpty().WithMessage("L'offre d'emploi associée est obligatoire.");
        }
    }
}
```

---

## 4. Intégration IA OpenAI C# (Exemple d'implémentation)

Pour analyser automatiquement les CV en C#, nous utilisons le client officiel d'OpenAI pour exécuter des requêtes structurées (Structured Outputs) :

```csharp
using OpenAI.Chat;
using System.Text.Json;

public class OpenAIParserService : IAiService
{
    private readonly string _apiKey;

    public OpenAIParserService(IConfiguration config)
    {
        _apiKey = config["OpenAI:ApiKey"];
    }

    public async Task<AiAnalysisResult> AnalyzeCvAsync(string cvText, string jobRequirements)
    {
        var client = new ChatClient("gpt-4o-mini", _apiKey);
        
        string systemMessage = "Tu es un assistant de recrutement expert. Tu dois extraire les informations de CV " +
                               "par rapport aux requis du poste et renvoyer un JSON structuré exact.";

        string userPrompt = $"Requis du poste :\n{jobRequirements}\n\nCV du candidat :\n{cvText}";

        ChatCompletionOptions options = new()
        {
            ResponseFormat = ChatResponseFormat.CreateJsonSchemaFormat(
                "candidate_analysis",
                BinaryData.FromString(GetJsonSchema())
            )
        };

        ChatCompletion completion = await client.CompleteChatAsync(
            new ChatMessage[] {
                new SystemChatMessage(systemMessage),
                new UserChatMessage(userPrompt)
            }, 
            options
        );

        var jsonResult = completion.Content[0].Text;
        return JsonSerializer.Deserialize<AiAnalysisResult>(jsonResult);
    }

    private string GetJsonSchema()
    {
        // Retourne le schéma JSON attendu correspondant aux DTO de l'application
        return "{\"type\":\"object\",\"properties\":{ ... }}";
    }
}
```

---

## 5. Configuration Docker Compose (Production Standard)

Pour instancier Kestrel (API C#) et PostgreSQL en un seul clic, voici le fichier `docker-compose.yml` pré-configuré :

```yaml
version: '3.8'

services:
  nexus-db:
    image: postgres:15-alpine
    container_name: nexus-postgresql
    environment:
      POSTGRES_DB: nexustalent_prod
      POSTGRES_USER: nexus_admin
      POSTGRES_PASSWORD: SecretPassword2026!
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
    networks:
      - nexus-network

  nexus-api:
    image: nexustalentsystem-api:latest
    container_name: nexus-webapi
    build:
      context: .
      dockerfile: NexusTalentSystem.Api/Dockerfile
    environment:
      - ASPNETCORE_ENVIRONMENT=Production
      - ConnectionStrings__DefaultConnection=Host=nexus-db;Database=nexustalent_prod;Username=nexus_admin;Password=SecretPassword2026!
      - Jwt__Secret=SuperLongAndSecureJwtSecretKeyKey2026!
      - OpenAI__ApiKey=YourOpenAiApiKeyHere
    ports:
      - "5000:80"
    depends_on:
      - nexus-db
    networks:
      - nexus-network

networks:
  nexus-network:
    driver: bridge

volumes:
  pgdata:
    driver: local
```
