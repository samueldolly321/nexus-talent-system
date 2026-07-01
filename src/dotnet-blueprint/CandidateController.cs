using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Threading.Tasks;
using System;
using System.Collections.Generic;

namespace NexusTalentSystem.Api.Controllers
{
    /// <summary>
    /// Gère les candidats, leurs pipelines de recrutement et le scoring IA associé.
    /// </summary>
    [Authorize]
    [ApiController]
    [Route("api/v1/candidates")]
    [Produces("application/json")]
    public class CandidateController : ControllerBase
    {
        private readonly IMediator _mediator; // CQRS Mediator pattern

        public CandidateController(IMediator mediator)
        {
            _mediator = mediator;
        }

        /// <summary>
        /// Récupère tous les candidats pour l'entreprise connectée (tenant isolé).
        /// </summary>
        /// <response code="200">Retourne la liste des candidats de l'entreprise.</response>
        /// <response code="401">Non authentifié.</response>
        [HttpGet]
        [ProducesResponseType(typeof(IEnumerable<CandidateDto>), 200)]
        [ProducesResponseType(401)]
        public async Task<IActionResult> GetAll([FromQuery] string jobId = null)
        {
            var query = new GetCandidatesQuery { JobId = jobId };
            var result = await _mediator.Send(query);
            return Ok(result);
        }

        /// <summary>
        /// Récupère le détail complet d'un candidat, y compris ses compétences extraites et ses scores IA.
        /// </summary>
        [HttpGet("{id}")]
        [ProducesResponseType(typeof(CandidateDetailsDto), 200)]
        [ProducesResponseType(404)]
        public async Task<IActionResult> GetById(string id)
        {
            var query = new GetCandidateByIdQuery(id);
            var result = await _mediator.Send(query);
            if (result == null) return NotFound(new { Message = "Candidat introuvable ou accès refusé." });
            return Ok(result);
        }

        /// <summary>
        /// Crée manuellement un nouveau candidat lié à une offre d'emploi.
        /// </summary>
        [HttpPost]
        [Authorize(Roles = "RH,AdminEntreprise,Manager")]
        [ProducesResponseType(typeof(CandidateDto), 201)]
        [ProducesResponseType(400)]
        public async Task<IActionResult> Create([FromBody] CreateCandidateCommand command)
        {
            var result = await _mediator.Send(command);
            return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
        }

        /// <summary>
        /// Modifie l'étape du pipeline de recrutement d'un candidat (Kanban drag-and-drop).
        /// </summary>
        [HttpPut("{id}/stage")]
        [Authorize(Roles = "RH,AdminEntreprise,Manager,ConsultantRecrutement")]
        [ProducesResponseType(200)]
        public async Task<IActionResult> UpdateStage(string id, [FromBody] UpdateCandidateStageCommand command)
        {
            if (id != command.CandidateId) return BadRequest("L'ID du candidat ne correspond pas.");
            var result = await _mediator.Send(command);
            return Ok(result);
        }

        /// <summary>
        /// Déclenche l'analyse IA sémantique et le calcul du score de compatibilité par rapport à l'offre.
        /// </summary>
        /// <remarks>
        /// Extrait automatiquement les compétences, l'expérience, la formation, calcule des scores partiels et globaux, 
        /// et génère des recommandations (Forces, Faiblesses, Décision).
        /// </remarks>
        [HttpPost("{id}/analyze")]
        [Authorize(Roles = "RH,AdminEntreprise")]
        [ProducesResponseType(typeof(CandidateAnalysisDto), 200)]
        [ProducesResponseType(400)]
        public async Task<IActionResult> TriggerAiAnalysis(string id)
        {
            var command = new AnalyzeCandidateWithAiCommand { CandidateId = id };
            var result = await _mediator.Send(command);
            return Ok(result);
        }

        /// <summary>
        /// Permet de faire des recherches sémantiques en langage naturel à l'aide de l'IA (ex: "Trouve les développeurs React avec + de 5 ans d'expérience").
        /// </summary>
        [HttpPost("ai-search")]
        [ProducesResponseType(typeof(AiSearchResultDto), 200)]
        public async Task<IActionResult> AiSearch([FromBody] AiSearchQuery query)
        {
            var result = await _mediator.Send(query);
            return Ok(result);
        }

        /// <summary>
        /// Supprime définitivement la fiche d'un candidat et ses fichiers associés.
        /// </summary>
        [HttpDelete("{id}")]
        [Authorize(Roles = "RH,AdminEntreprise")]
        [ProducesResponseType(204)]
        public async Task<IActionResult> Delete(string id)
        {
            var command = new DeleteCandidateCommand(id);
            await _mediator.Send(command);
            return NoContent();
        }
    }

    // Dummy Interface to support compilation styling
    public interface IMediator 
    {
        Task<T> Send<T>(object request);
    }

    // DTO Definitions
    public class CandidateDto 
    {
        public string Id { get; set; }
        public string Name { get; set; }
        public string Email { get; set; }
        public string Stage { get; set; }
        public DateTime AppliedAt { get; set; }
    }

    public class CandidateDetailsDto : CandidateDto
    {
        public string Phone { get; set; }
        public string Location { get; set; }
        public string LinkedinUrl { get; set; }
        public string CvText { get; set; }
    }

    public class CandidateAnalysisDto
    {
        public string CandidateId { get; set; }
        public int GlobalScore { get; set; }
        public string Summary { get; set; }
        public List<string> Strengths { get; set; } = new();
    }

    public class AiSearchResultDto
    {
        public List<string> MatchedIds { get; set; } = new();
        public string Explanation { get; set; }
    }

    public class GetCandidatesQuery { public string JobId { get; set; } }
    public class GetCandidateByIdQuery { public GetCandidateByIdQuery(string id) { } }
    public class CreateCandidateCommand { public string JobId { get; set; } public string Name { get; set; } public string Email { get; set; } }
    public class UpdateCandidateStageCommand { public string CandidateId { get; set; } public string Stage { get; set; } }
    public class AnalyzeCandidateWithAiCommand { public string CandidateId { get; set; } }
    public class AiSearchQuery { public string Query { get; set; } }
    public class DeleteCandidateCommand { public DeleteCandidateCommand(string id) { } }
}
