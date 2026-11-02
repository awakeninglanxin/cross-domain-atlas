<!-- Page 1 -->

## Lyapunov spectrum of random neural networks

### David G. Clark

Center for Computational Neuroscience, Flatiron Institute, New York, NY 10010, USA dclark@flatironinstitute.org

### October 8, 2026

Abstract

The Lyapunov spectrum of a nonlinear recurrent neural network with random asymmetric couplings is calculated in the limit N → ∞. The calculation is based on a finite-N identity that expresses the cumulative distribution of Lyapunov exponents as a response function of the tangent-space dynamics, with the tangent trajectory selected by a minimum-norm condition rather than by an initial condition. A cavity method then determines this response function at large N through a self-consistent single-site problem. This result establishes that the chaos in this network is extensive and gives access to diffeomorphism-invariant properties of the dynamics. This work was done in collaboration with the AI models GPT-6 Astra and Claude Opus 5.5.

Code and data: https://github.com/davidclark1/rnn-lyapunov.

1


<!-- Page 2 -->

## Contents

1 Introduction 3 1.1 Lyapunov exponents . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 3 1.2 Attractor dimension and entropy rate . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 3 1.3 Random neural networks . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 4 1.4 Roadmap . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 5 1.5 Related work . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 6 1.6 Use of AI . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 7

2 Derivation 7 2.1 Part 1: Cumulative distribution as a response function . . . . . . . . . . . . . . . . . . . . . . 7 2.2 Part 2: Regularized forward–backward system . . . . . . . . . . . . . . . . . . . . . . . . . . . 10 2.3 Part 3: Cavity method and single-site theory . . . . . . . . . . . . . . . . . . . . . . . . . . . 12

3 Results 16 3.1 Trivial fixed point and maximum Lyapunov exponent . . . . . . . . . . . . . . . . . . . . . . 16 3.2 Numerical solution and simulations . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 17 3.3 Lyapunov spectra . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 17 3.4 Attractor dimension, entropy rate, and participation-ratio dimensions . . . . . . . . . . . . . 17

4 Discussion 19

Acknowledgments 20

AI methodology 20

References 23

Appendix A Lyapunov spectrum at the trivial fixed point 27 A.1 Lyapunov spectrum at the trivial fixed point from the circular law . . . . . . . . . . . . . . . 27 A.2 Lyapunov spectrum from the single-site theory . . . . . . . . . . . . . . . . . . . . . . . . . . 28 A.2.1 Electrostatic interpretation . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 30

Appendix B Maximum Lyapunov exponent 31 B.1 Maximum Lyapunov exponent from two copies of the network . . . . . . . . . . . . . . . . . . 31 B.1.1 Limiting cases . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 32 B.2 Maximum Lyapunov exponent from the single-site theory . . . . . . . . . . . . . . . . . . . . 33

Appendix C Participation-ratio dimension at finite time step 34

Appendix D Numerical methods 35 D.1 Single-site theory . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 35 D.2 Simulations . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 36

2


<!-- Page 3 -->

### 1 Introduction

A defining feature of chaotic dynamical systems is extreme sensitivity to initial conditions, collo quially called the butterfly effect. In such systems, nearby trajectories separate exponentially in time. The rate of separation, called a Lyapunov exponent, depends on the direction of the initial displacement, and the full set of rates defines the Lyapunov spectrum. A generic displacement has a nonzero component along the most rapidly expanding direction, and thus at late times the sep aration is governed by the maximum Lyapunov exponent. The full Lyapunov spectrum, however, contains much more information than the maximum Lyapunov exponent alone, providing a rich characterization of chaos. A canonical example of chaos in high dimensions, described in Sec. 1.3, is the random neural network of Sompolinsky et al. \[1\], who named the “evaluation of the whole distribution of Lyapunov exponents” of this network as an open problem nearly four decades ago. The present work solves this problem.

1.1 Lyapunov exponents

We consider dynamics in discrete time, x(n + 1) = G(x(n)) with x(n) ∈ R N . This includes the Euler discretization with time step δ of a continuous-time system x˙(t) = f(x(t)), for which G(x) = x + δf(x). An infinitesimal perturbation of a trajectory, or tangent vector, v(n) evolves under the linearized (tangent-space) dynamics

v(n + 1) = M(n) v(n), (1)

where Mij (n) = ∂Gi(x)/∂xj | x=x(n) is the Jacobian of G(x) evaluated at x(n). After m steps, the perturbation is v(m + 1) = M(m)· · · M(1) v(1). This product of Jacobians along a trajectory is called the derivative cocycle. If σ1(m) ≥ · · · ≥ σN (m) are the singular values of the derivative cocycle, the Lyapunov exponents are

λi = lim m→∞ 1 mδ log σi(m), i = 1, . . . , N. (2)

Since mδ is the elapsed physical time, the exponents λi are rates per unit time rather than per step, which makes the exponents λi comparable across time steps. Additionally, as δ → 0, the exponents λi approach those of the continuous-time system. Geometrically, the linearized dynamics deform an infinitesimal ball of initial conditions into an ellipsoid whose principal axes grow or shrink exponentially at the rates λi . The existence of the Lyapunov exponents is established relative to an invariant measure, that is, a distribution of states preserved by the dynamics. For a dissipative system, whose trajectories approach an attractor of zero volume, the relevant invariant measure is the distribution of states visited by the trajectory of a typical initial condition in phase space \[2\]. As in numerical studies, we assume that the dynamics have a single such measure and that this measure is ergodic. For an ergodic invariant measure, the multiplicative ergodic theorem of Oseledets guarantees that, under mild conditions on the Jacobians, the long-time limit in Eq. (2) exists and takes the same values for all trajectories that are typical with respect to this measure \[3\].

1.2 Attractor dimension and entropy rate

The Lyapunov spectrum provides access to two basic properties of the dynamics, namely, the attractor dimension and the entropy rate, which we now review. Since the Lyapunov spectrum is invariant under diffeomorphisms applied to the phase space, these and other quantities derived

3


<!-- Page 4 -->

from the Lyapunov spectrum are intrinsic properties of the dynamics, independent of the arbitrary choice of coordinates. We start with the attractor dimension. Note that the sum λ1 + · · · + λk is the growth rate of k-dimensional volumes in tangent space. In a dissipative system, this rate is negative for k = N, since phase-space volume contracts onto the attractor. If the system is also chaotic, that is, if λ1 > 0, k-dimensional volumes grow for sufficiently small k and shrink for k = N. Thus, a natural estimate of the attractor dimension is the value of k at which growth and contraction balance. To this end, let j be the largest integer k for which λ1 + · · · + λk ≥ 0. Interpolating the sum λ1 + · · · + λk linearly between k = j and k = j + 1 and locating the zero of the interpolation gives the Kaplan–Yorke dimension \[4, 5\]

DKY = j + λ1 + · · · + λj |λj+1| . (3)

Kaplan and Yorke conjectured that DKY equals the information dimension of the invariant measure, which describes how the attractor fills phase space at increasingly fine resolution. This conjecture has been proven in special cases \[6, 7\]. In any case, DKY is a coordinate-invariant probe of the attractor dimension, and we refer to DKY simply as the attractor dimension. We now turn to the entropy rate. Suppose we partition phase space into cells and record the sequence of cells that a trajectory visits. Two initial conditions in the same cell by definition cannot be distinguished at the resolution of the partition. Over time, for a generic displacement between the two initial conditions, the separation of the two trajectories grows, so the two trajectories eventually visit different cells. The Kolmogorov–Sinai entropy rate hKS is the growth rate, per unit time, of the entropy of these symbolic sequences, maximized over partitions \[8, 9\]. That is, hKS is the rate at which the dynamics reveal information about the initial condition. According to Ruelle’s inequality \[10\], hKS ≤ X λi>0 λi . (4)

Pesin’s formula states that, under suitable conditions on the invariant measure \[11\], this inequality is an equality, i.e., hKS equals the sum of the positive Lyapunov exponents \[12\]. Pesin’s formula thus plays the same role for the entropy rate that the Kaplan–Yorke conjecture plays for the attractor dimension, linking a quantity defined through the invariant measure to a function of the Lyapunov spectrum. In any case, the sum of the positive exponents is a coordinate-invariant estimate of the entropy rate. In this paper, we write hKS for the sum of the positive exponents and refer to hKS as the entropy rate.

1.3 Random neural networks

The discussion so far applies to any smooth dynamical system. We now turn to the random neural network of Sompolinsky et al. \[1\]. This model consists of N randomly coupled neurons, each of which low-pass filters its input and applies a nonlinearity that models the conversion from membrane potential to firing rate. Networks of such neurons are called rate networks. The chaotic phase of this model has long served as a model of the spontaneous activity observed in cortex in vivo. The model has also been broadly influential in neuroscience \[13\], particularly in light of the ability to train such networks to perform tasks \[14, 15\]. As N → ∞, dynamical mean-field theory describes the statistics of single-neuron activity in this model and predicts a second-order transition to chaos as the coupling strength g crosses the critical value g = 1 \[1, 16\]. Furthermore, Sompolinsky et al. \[1\] obtained a Schrödinger-type equation whose ground-state energy determines the maximum Lyapunov exponent. This approach has since

4


<!-- Page 5 -->

yielded the maximum Lyapunov exponents of networks with several populations of neurons \[17\] and of networks driven by external input \[18, 19\]. At time step δ = 1, where the network has no leak, the equations simplify and provide the maximum Lyapunov exponent in closed form \[20, 21\]. In foundational prior work, Engelken et al. \[22\] computed the full Lyapunov spectrum of this model numerically by evolving a set of vectors under the tangent dynamics and periodically or thonormalizing them via a QR decomposition \[23\], which keeps the vectors from growing without bound along the expanding directions. When the exponents are plotted against their rank divided by N, the Lyapunov spectrum converges to a limit as N → ∞, indicating that the attractor dimen sion and the entropy rate are extensive, i.e., DKY/N and hKS/N converge to self-averaging values of order one. The linear scaling of these quantities with N is known as extensive chaos \[24\], which has also been observed numerically in discrete-time versions of this model \[25\]. Both DKY/N and hKS/N vanish at the onset of chaos and grow as the coupling strength increases beyond the onset. In continuous time (δ → 0), the attractor dimension remains below about one tenth of N even at large g, so that the attractor, while extensive, is low-dimensional relative to the full phase space. Analytically, rather than numerically, the full Lyapunov spectrum has been obtained only in limiting regimes. In the stable phase, the dynamics are linear around the trivial fixed point, at which all neurons are silent, and the Lyapunov spectrum follows from the eigenvalue density of the coupling matrix, given by the circular law \[25–28\]. In other limits, Engelken et al. \[22\] approximated the full Lyapunov spectrum by combining random-matrix theory with ansätze for the Jacobians. Sompolinsky et al. \[1\] argued that “the number of positive Lyapunov exponents for \[g > 1\] is macroscopic, i.e., proportional to N,” because nearby trajectories diverge exponentially in the mean-field theory, which already describes the limit N → ∞. This paper derives the full Lyapunov spectrum of this model at large N, establishing as a byproduct that the chaos is extensive.

1.4 Roadmap

The derivation (Sec. 2) has three parts.

- In the first part (Sec. 2.1), which is exact at finite N, we express the cumulative distribution

of Lyapunov exponents as a response function of the tangent dynamics. In particular, we first shift the tangent dynamics so that every exponent is lowered by a constant s; the cumulative distribution at s is then the fraction of decaying tangent directions. We show that the one step response of the minimum-norm solution of the shifted tangent dynamics driven by a source is the projector onto the decaying directions. Thus, the trace of this response gives the number of decaying directions, i.e., the number of Lyapunov exponents less than s.

- In the second part (Sec. 2.2), we cast the minimum-norm solution of the shifted tangent

dynamics as the limit of the solution of a regularized least-squares problem as the regular ization vanishes, and we write this problem as a forward–backward dynamical system with a 2N-dimensional state, consisting of an N-dimensional field that runs forward in time and another that runs backward. The restriction of the solution of this system to the forward field solves the regularized problem.

- In the third part (Sec. 2.3), we compute the forward-system response at large N with the

cavity method, applied jointly to this forward–backward system and the network dynamics, at fixed regularization. This involves adding one neuron to the network, along with its forward and backward fields. The effect of the rest of the network on this neuron reduces to the standard mean-field description of its activity and to two kernels for its forward and backward fields, which are determined self-consistently. The result is a single-site problem in

5


<!-- Page 6 -->

which the time-varying gains of the neuron, that is, the slopes of its nonlinearity, are sampled from the known dynamical mean-field theory and drive the forward and backward fields. The solution of this single-site problem, with the regularization taken to zero at the end, gives the cumulative distribution of Lyapunov exponents at large N, assuming that the limit of large N and the limit of vanishing regularization can be exchanged.

Following the derivation, in Sec. 3, we first show analytically that the single-site theory recovers known results, and their straightforward extensions to finite δ, for the Lyapunov spectrum at the trivial fixed point and the maximum Lyapunov exponent in the chaotic phase. We then solve the single-site problem numerically and compare the resulting Lyapunov spectra, attractor dimensions, and entropy rates with simulations of large networks.

1.5 Related work

Prior analytical work on the dimension of the activity in this model has focused not on the attractor dimension but on the so-called participation-ratio dimension, which provides a soft count of the dimensions of the linear subspace explored by the activity. This subspace is identified by principal component analysis \[29\]. Clark et al. \[30\] computed the participation ratio with a two-site cavity method, and Clark et al. \[31\] later computed it from fluctuations around the saddle point of the path integral. These calculations showed analytically that the participation ratio is extensive. Because the participation ratio is a dimension of a linear subspace, it depends on the choice of variables \[32\], unlike the attractor dimension. The maximum Lyapunov exponent and the participation ratio each reduce a spectrum—the Lyapunov spectrum and the spectrum of the covariance matrix of the activity, respectively—to a single number. For the covariance matrix, the full spectrum is now known from a recent line of work. For randomly coupled linear networks driven by noise that is independent across neurons, the covariance matrix is an explicit function of the couplings, and the spectrum of the covariance matrix follows from random-matrix theory \[33, 34\]. The covariance matrix of the present nonlinear, autonomous network was then proposed \[35\] and analytically shown \[36, 37\] to coincide with that of a linear network with the same couplings driven by noise, an example of linear equivalence. Importantly, this equivalence holds only for the covariance matrix, and other properties of the two networks differ. In particular, the linear network is stable, with a negative maximum Lyapunov exponent. The full Lyapunov spectrum must therefore be computed from the nonlinear dynamics directly, as we do here. Beyond rate networks, Lyapunov spectra have been computed for networks of spiking neu rons \[38–42\]. Although spikes are discontinuous events, the state of the network, typically given by the membrane potentials of all neurons, can be propagated exactly from one spike time to the next, defining a discrete-time map. The Lyapunov spectrum can then be computed using products of the Jacobians of this map \[38\]. In balanced networks (in which large excitatory and inhibitory input currents approximately cancel, leaving strong fluctuations), such numerical computations revealed extensive chaos \[38, 41\]. These computations also revealed intriguing phenomena such as “stable chaos,” in which the activity is irregular and unstable to finite perturbations, such as the removal of a single spike, despite being stable to infinitesimal perturbations \[39, 43\]. Outside neural networks, Ruelle \[24\] argued that chaos should be extensive in spatially extended systems comprising many weakly interacting subsystems. Systems with all-to-all coupling, such as the present network, lack this structure, so extensive chaos in such systems is nontrivial \[22, 44\]. In machine learning, signals propagating through deep networks at initialization undergo a tran sition between an ordered and a chaotic phase \[45\], and the proximity to this transition predicts

6


<!-- Page 7 -->

how well networks can be trained \[46, 47\]. Relatedly, in recurrent networks, pushing the Lyapunov exponents toward zero during training improves the learning of long-time dependencies \[48\]. Lya punov analysis has also proved useful for interpreting the computations of trained networks. In modern looped models that reason by iterating a latent state toward a fixed point encoding the solution, the reasoning dynamics have been suggested to become transiently chaotic on harder tasks, as trajectories linger near unstable states that correspond to nearly correct solutions \[49\]. Additionally, in large language models, the Jacobian of the final-layer activations with respect to intermediate activations defines directions in activation space that correspond to words the model is disposed to produce, aiding interpretability \[50\]. A dynamical-systems description of how per turbations propagate through a network, such as the one provided by the Lyapunov spectrum, may refine such analyses. Methodologically, our calculation rests on the relation, derived in Part 1 (Sec. 2.1), between the minimum-norm solution and the projector onto the decaying directions. This relation underlies prior numerical methods for computing this projector, known as the dichotomy projector \[51, 52\]. The same shift of the exponents by s underlies the dichotomy (Sacker–Sell) spectrum and the computation of this spectrum \[53, 54\]. A version of this relation integrated over s follows from a theorem of Deninger \[55\], which equates the sum of the positive Lyapunov exponents with a Fuglede–Kadison log-determinant of the propagation operator (AI methodology).

1.6 Use of AI

This work was done in collaboration with the AI models GPT-6 Astra and Claude Opus 5.5. GPT-6 Astra produced an initial derivation. Working with both models, the author then arrived at the more physically transparent derivation presented in Sec. 2. Claude Opus 5.5 wrote all code and generated all figures, under the direction of the author, and assisted in writing and revision of the text. Details are given in AI methodology.

### 2 Derivation

2.1 Part 1: Cumulative distribution as a response function

We begin by specifying the network and its tangent dynamics. We then show that counting the Lya punov exponents below a threshold s amounts to computing a response function of the minimum norm solution of the shifted tangent dynamics driven by a source. We consider the Euler discretization, with time step 0 < δ ≤ 1, of the random neural network of Sompolinsky et al. \[1\],

xi(n + 1) = (1 − δ) xi(n) + δ X N

j=1 Jij ϕ(xj (n)), (5)

Jij i.i.d. ∼ N  0, g 2 N  , (6)

where g is the coupling strength and ϕ(x) = tanh(x) is a nonlinearity. We write di(n) = ϕ ′ (xi(n)) for the so-called gains and D(n) = diag d1(n), . . . , dN (n)  for the diagonal matrix of gains at time n. Equation (5) has the form x(n+ 1) = G(x(n)) of Sec. 1.1, with G(x) = (1−δ) x+δJϕ(x), where ϕ(x) acts elementwise on x. The Jacobian of G(x) at x(n) is

M(n) = (1 − δ)IN + δJD(n), (7)

7


<!-- Page 8 -->

so that a tangent vector evolves as v(n + 1) = M(n) v(n), and the Lyapunov exponents λ1 ≥

- · · ≥ λN are given by Eq. (2). We would like to compute the cumulative distribution of Lyapunov

exponents, F(s) = 1 N #{i : λi < s}. (8)

To count the Lyapunov exponents below s, we shift the Lyapunov exponents. In particular, multiplying the Jacobian M(n) at every step by e −δs lowers every Lyapunov exponent by s. The shifted tangent dynamics,

v(n + 1) = Ms(n) v(n), (9) Ms(n) = e −δsM(n)

= αsIN + βsJD(n), (10)

with

αs = (1 − δ) e −δs , (11) βs = δ e−δs , (12)

therefore have Lyapunov exponents λi − s. Forward in time, the shifted dynamics shrink the directions with λi < s exponentially and grow the directions with λi > s exponentially. Backward in time, the roles are reversed. Thus, NF(s) is the number of directions that decay forward in time under the shifted dynamics, and the task is to count these directions. To do so, we consider tangent trajectories on the infinite window of times n ∈ Z. We collect a sequence of tangent vectors v(n) and a source I v (n), which drives the step from time n to time n + 1, into the vectors

V = 

      . . . v(1) v(2) . . . 

      , I v = 

      . . . I v (1) I v (2)

. . . 

      . (13)

The shifted dynamics driven by this source,

v(n + 1) = Ms(n) v(n) + I v (n), (14)

where n ∈ Z, can then be written as KV = I v , (15) where K is the block-bidiagonal matrix

K = 

      . . . . . . −Ms(1) IN −Ms(2) IN . . . . . . 

      . (16)

For any sequence of tangent vectors V, the product KV collects the residuals of the steps,

(KV)(n) = v(n + 1) − Ms(n) v(n), (17)

for n ∈ Z. Each block row of K corresponds to one step. We assume that M(n) is invertible for every n, so that Eq. (15) can be solved both forward and backward in time. Since Eq. (15) imposes

8


<!-- Page 9 -->

no initial condition, the tangent vector v(n) at any single time n can then be chosen freely, and the solutions of Eq. (15) form an N-dimensional affine family, consisting of any particular solution plus a free tangent trajectory, i.e., a solution of the homogeneous system KV = 0. Our first step is to remove this freedom, not by fixing the tangent vector at any time, but by selecting the solution of Eq. (15) with minimum norm, ∥V∥2 2 = P n∈Z ∥v(n)∥ 2 2 . By linearity, it suffices to consider a source that acts at a single time k, i.e., I v (k) = w and I v (n) = 0N for n ̸= k. A generic solution of Eq. (15) grows exponentially as n → ∞, as n → −∞, or both. We now explicitly construct the one solution that decays in both directions, which is the only solution with finite norm and hence the minimum-norm solution. We assume that no Lyapunov exponent equals s, so that no direction is marginal under the shifted dynamics. The multiplicative ergodic theorem of Oseledets provides, for a typical trajectory, a splitting of the tangent space at every time n into subspaces, one for each distinct Lyapunov exponent, such that the norms of the tangent vectors in each subspace change at the rate given by the exponent of that subspace, both forward and backward in time \[3\]. Grouping these subspaces according to whether their exponents lie below or above s gives the splitting R N = Es (n) ⊕ Eu (n), where the stable subspace Es (n) is spanned by the tangent vectors whose norms change at rates λi < s and the unstable subspace Eu (n) by the tangent vectors whose norms change at rates λi > s. Forward in time, the shifted dynamics shrink vectors in Es (n) exponentially and grow vectors in Eu (n) exponentially. Backward in time, the roles are reversed. The source w enters the tangent vector at time k + 1, and we decompose w using the subspaces at time k + 1. Let P(k + 1) be the projector onto Es (k + 1) along Eu (k + 1), so that IN − P(k + 1) is the projector onto Eu (k + 1) along Es (k + 1). We decompose the source into its stable and unstable components, P(k + 1) w and \[IN − P(k + 1)\] w. Because the splitting is a direct sum, this decomposition exists and is unique for each w. We then construct a solution of Eq. (14), which we refer to as the constructed solution, that behaves as follows. Coming in from n = −∞, where the tangent vector vanishes, the tangent vector grows within Eu (n) and is mapped to −\[IN −P(k+1)\] w by the step from time k to time k + 1. In the same step, the source w cancels this unstable vector and leaves the stable component P(k + 1) w, which then decays within Es (n) as n → ∞. To compute this solution, we propagate the stable component forward in time from time k + 1, and the negative of the unstable component backward in time from time k + 1,

. . . v(k − 1) = −Ms(k − 1)−1Ms(k) −1 \[IN − P(k + 1)\] w,

v(k) = −Ms(k) −1 \[IN − P(k + 1)\] w,

v(k + 1) = P(k + 1) w, v(k + 2) = Ms(k + 1) P(k + 1) w,

. . . (18)

One can verify that the constructed solution, Eq. (18), solves Eq. (14). Away from the source, the constructed solution, Eq. (18), follows the free shifted dynamics. For example, immediately before the source,

Ms(k − 1) v(k − 1) = −Ms(k) −1 \[IN − P(k + 1)\] w

= v(k), (19)

9


<!-- Page 10 -->

and immediately after the source,

Ms(k + 1) v(k + 1) = Ms(k + 1) P(k + 1) w

= v(k + 2), (20)

and likewise at all other times away from the source. Across the source,

Ms(k) v(k) + w = −\[IN − P(k + 1)\] w + w

= P(k + 1) w = v(k + 1). (21)

Because the stable component decays forward in time and the negative of the unstable component decays backward in time, the constructed solution, Eq. (18), decays exponentially in both directions and therefore has finite norm. Every other solution differs from the constructed solution, Eq. (18), by a nonzero free tangent trajectory. Unlike the constructed solution, which switches from the unstable to the stable subspace at the source, a free tangent trajectory receives no source and thus has a nonzero component that grows exponentially forward or backward in time. Every other solution therefore has infinite norm, so the constructed solution, Eq. (18), is the only solution of Eq. (15) with finite norm and hence the minimum-norm solution. We can now read off the cumulative distribution. The constructed solution, Eq. (18), has v(k + 1) = P(k + 1) w, so the one-step response of the minimum-norm solution is the N ×N matrix ∂v(k + 1)/∂Iv (k) = P(k + 1). The causal solution, which propagates the whole source forward rather than only its stable component, would instead give IN . Since the trace of a projector is the dimension of the range of the projector, and dim Es (k + 1) = NF(s),

F(s) = 1 N tr ∂v(k + 1) ∂Iv(k) . (22)

Equation (22) is exact at finite N for every s that is not a Lyapunov exponent.

2.2 Part 2: Regularized forward–backward system

To compute the trace in Eq. (22) at large N, we recast the minimum-norm solution in a form to which the cavity method applies. We do so in two steps. First, we write the minimum-norm solution as the limit of the unique solution of a regularized least-squares problem as the regularization vanishes. Second, we write this regularized problem as a forward–backward dynamical system for two fields, a forward field that runs forward in time and a backward field that runs backward in time. The restriction of the solution of this system to the forward field solves the regularized problem. We denote the regularization by η 2 and call the minimizer of the regularized least-squares cost the regularized solution, V = arg min V′  KV ′ − Iv 2 2 + η 2 ∥V′ ∥ 2 2  . (23)

The minimizer is unique, since the penalty η 2∥V′∥ 2 2 makes the cost strictly convex. We write

R vv(n, n′ ) = ∂v(n) ∂Iv(n′) (24)

for the response of the regularized solution, Eq. (23), an N × N matrix for each pair of times. As η → 0 +, the regularized solution, Eq. (23), converges to the minimum-norm solution, as for any

10


<!-- Page 11 -->

regularized least-squares problem that has a solution of finite norm. Thus, Eq. (22) becomes

F(s) = lim η→0+ 1 N tr R vv(k + 1, k). (25)

All responses below are evaluated at fixed η > 0 and depend on η, as they do on s. Setting the gradient of the cost to zero shows that the regularized solution, Eq. (23), satisfies

KT (KV − Iv ) + η 2V = 0. (26)

To turn this into a dynamical system, we introduce the rescaled residual

U = 

      . . . u(1) u(2) . . . 

      = I v − KV η . (27)

In terms of U, the condition for the regularized solution, Eq. (23), becomes the pair of equations

η U + KV = I v , (28) −KTU + η V = 0. (29) Note that, at η = 0, these two equations decouple, and the forward field V then obeys Eq. (15), with the freedom of Part 1 unresolved, so that the two equations do not select a solution. For η > 0, the forward and backward fields are coupled at every time, and this coupling selects the regularized solution, Eq. (23). As η → 0 +, the backward field vanishes. We add a second source I u to the right-hand side of the second equation. The readout of the cumulative distribution F(s), Eq. (25), does not use the source I u , but the cavity calculation of Part 3 (Sec. 2.3) does. In block-matrix form,

B U V ! = I v I u ! , (30)

where B = ηI K −KT ηI ! , (31)

with I the identity on infinite sequences of N-dimensional vectors. The matrix B is η times the identity plus an antisymmetric matrix, so z T Bz = η∥z∥ 2 2 for every z. For η > 0, B is therefore positive definite and hence invertible, so Eq. (30) has a unique solution. At I u = 0, the restriction of this solution to the forward field V is the regularized solution, Eq. (23). This construction is closely related to Hermitization, a standard tool for the spectra of non-Hermitian random matrices \[56\]. Written out, the first block row of Eq. (30) is a forward equation for v(n), and the second is a backward equation for u(n). Together with the network, which drives both through the gains, the full system is

xi(n + 1) = (1 − δ) xi(n) + δ hX N

j=1 Jij ϕ(xj (n)) + I x i (n) i , (32)

vi(n + 1) = αs vi(n) + βs X N

j=1 Jij dj (n) vj (n) − η ui(n) + I v i (n), (33)

ui(n − 1) = αs ui(n) + βs di(n) X N

j=1 Jji uj (n) + η vi(n) − I u i (n), (34)

11


<!-- Page 12 -->

for all n ∈ Z. On the infinite window, this system is statistically stationary. We have also given the network a source I x i (n), which the cavity calculation uses to define the network’s own response; in the physical dynamics, the source I x i (n) is zero. Generalizing Eq. (24), we write Rab(n, n′ ) = ∂a(n)/∂I b (n ′ ), with a, b ∈ {x, u, v}, for the N × N response matrices of this system, and Rab ij (n, n′ ) for the entries of these matrices. When all three sources vanish, the forward and backward fields vanish, v(n) = u(n) = 0N , while the neurons follow the chaotic network dynamics.

2.3 Part 3: Cavity method and single-site theory

We now compute the response Rvv(k + 1, k) at large N with the cavity method, applied jointly to the regularized forward–backward system of Part 2 (Sec. 2.2) and the network dynamics. To do so, we add a new neuron with index 0 to a network of N neurons with indices i ∈ {1, . . . , N}, which we call the reservoir. We compute how neuron 0 perturbs the reservoir and how the perturbed reservoir acts back on neuron 0, then close the resulting equations self-consistently. For a large network, Eq. (25) gives the cumulative distribution

lim N→∞ F(s) = lim N→∞ lim η→0+ 1 N tr R vv(k + 1, k). (35)

The cavity calculation below is carried out at fixed η > 0, where the forward–backward system of Part 2 (Sec. 2.2) has a unique solution. We therefore take N → ∞ before η → 0 +,

lim N→∞ F(s) = lim η→0+ lim N→∞ 1 N tr R vv(k + 1, k), (36)

assuming that the limits N → ∞ and η → 0 + can be exchanged. This exchange is the main assumption of the calculation. It is supported by the agreement with simulations (Sec. 3); the analogous exchange is routinely assumed in random-matrix theory, both for Hermitian matrices \[57\] and, through Hermitization, for non-Hermitian matrices \[56\]. Below, F(s) denotes the large-N limit, Eq. (36). As is standard in the cavity method, we assume that the normalized trace in Eq. (36) is self averaging, so that at large N it equals the response of a typical neuron. It therefore suffices to compute the response of neuron 0 to the sources I v 0 (n) and I u 0 (n) of neuron 0, with the sources of the reservoir neurons set to zero. The reservoir neurons have indices i, j ∈ {1, . . . , N}. Without neuron 0, the reservoir receives no source, so the forward and backward fields of the reservoir vanish (Part 2, Sec. 2.2). The couplings of neuron 0, J0i and Ji0, are drawn i.i.d. from N (0, g2/N), independently of the reservoir couplings Jij and hence of the reservoir dynamical variables. The self-coupling J00 gives terms of order N −1/2 , which we drop. Below, xi(n), di(n), and the response functions Rab ij (n, n′ ), including the network’s own response Rxx ij (n, n′ ), refer to the reservoir without neuron 0. The introduction of neuron 0 perturbs the reservoir. In particular, neuron 0 adds the input δJi0ϕ(x0(n)) to Eq. (32), the input βsJi0d0(n)v0(n) to Eq. (33), and the input βsdi(n)J0iu0(n) to Eq. (34). Each of these additional inputs is O(N −1/2 ) and enters the reservoir equations like a source, so at leading order in N −1/2 the reservoir responds linearly, through the reservoir responses Rab ij (n, n′ ). The states of the reservoir neurons are perturbed by ∆xi(n), while the forward and

12


<!-- Page 13 -->

backward fields of the reservoir, which were zero, acquire values vi(n) and ui(n) that are O(N −1/2 ),

∆xi(n) = X N

j=1 X

n′∈Z R xx ij (n, n′ ) Jj0 ϕ(x0(n ′ )), (37)

vi(n) = βs X N

j=1 X

n′∈Z h R vv ij (n, n′ ) Jj0 d0(n ′ ) v0(n ′ ) − R vu ij (n, n′ ) dj (n ′ ) J0j u0(n ′ ) i , (38)

ui(n) = βs X N

j=1 X

n′∈Z h R uv ij (n, n′ ) Jj0 d0(n ′ ) v0(n ′ ) − R uu ij (n, n′ ) dj (n ′ ) J0j u0(n ′ ) i . (39)

By contrast, the fields v0(n) and u0(n) of neuron 0, which the sources I v 0 (n) and I u 0 (n) drive directly (Eqs. (41) and (42) below), are O(1). The perturbations ∆xi(n) also perturb the gains, by ∆di(n) = ϕ ′′(xi(n)) ∆xi(n), which is O(N −1/2 ). However, these gain perturbations contribute to the equations for v0(n) and u0(n), Eqs. (41) and (42) below, only as sums of N terms, each O(N −3/2 ). These sums are at most O(N −1/2 ), even if the terms add coherently, and are thus negligible relative to the O(1) terms of these equations. We therefore drop the gain perturbations. These perturbations act back on neuron 0. Inserting Eqs. (37)–(39) into Eqs. (32)–(34) for neuron 0, with ϕ(xi(n)) expanded to first order in ∆xi(n), gives

x0(n + 1) = (1 − δ) x0(n) + δ h ξ0(n) + X

n′∈Z Γ xx(n, n′ ) ϕ(x0(n ′ )) i , (40)

v0(n + 1) = αs v0(n) − η u0(n) + X

n′∈Z h Γ vv(n, n′ ) d0(n ′ ) v0(n ′ ) − Γ vu(n, n′ ) u0(n ′ ) i + I v 0 (n), (41)

u0(n − 1) = αs u0(n) + η v0(n) + d0(n) X

n′∈Z h Γ uv(n, n′ ) d0(n ′ ) v0(n ′ ) − Γ uu(n, n′ ) u0(n ′ ) i − I u 0 (n),

(42)

where the neuronal cavity field is

ξ0(n) = X N

i=1 J0i ϕ(xi(n)), (43)

and the reaction kernels are

Γ xx(n, n′ ) = X N

i,j=1 J0i di(n) R xx ij (n, n′ ) Jj0, (44)

Γ vv(n, n′ ) = β 2 s X N

i,j=1 J0i di(n) R vv ij (n, n′ ) Jj0, (45)

Γ vu(n, n′ ) = β 2 s X N

i,j=1 J0i di(n) R vu ij (n, n′ ) dj (n ′ ) J0j , (46)

Γ uv(n, n′ ) = β 2 s X N

i,j=1 Ji0 R uv ij (n, n′ ) Jj0, (47)

Γ uu(n, n′ ) = β 2 s X N

i,j=1 Ji0 R uu ij (n, n′ ) dj (n ′ ) J0j . (48)

13


<!-- Page 14 -->

We now take N to be large. By the cavity construction, the couplings of neuron 0 are in dependent of the reservoir quantities that these couplings multiply in Eqs. (43)–(48). Together with the number of row couplings J0i and column couplings Ji0 that each quantity contains, this independence determines the large-N behavior of each quantity.

- The neuronal cavity field ξ0(n) is linear in the row couplings J0i

. Since these couplings are independent of the reservoir activations ϕ(xi(n)), the neuronal cavity field is Gaussian, with mean zero and covariance (g 2/N) PN i=1 ϕ(xi(n)) ϕ(xi(n ′ )).

- The kernels Γ

xx(n, n′ ), Γ vv(n, n′ ), and Γ uu(n, n′ ) contain one row and one column coupling, J0iJj0. Since the row and column couplings are independent of each other and of the reservoir quantities, these kernels have mean zero and are O(N −1/2 ), so we drop them.

- The kernels Γ

vu(n, n′ ) and Γ uv(n, n′ ) contain two row couplings, J0iJ0j , and two column cou plings, Ji0Jj0, respectively. Since these couplings are independent of the reservoir quantities,

X N

i,j=1 J0iJ0j Zij → g 2 N X N

i=1 Zii (49)

for reservoir quantities Zij , and likewise for column couplings. These kernels therefore con centrate to O(1) quantities,

Γ vu(n, n′ ) → A(n, n′ ), (50) Γ uv(n, n′ ) → γs P(n, n′ ), (51)

where γs = β 2 s g 2 and

A(n, n′ ) = γs N X N

i=1 di(n) R vu ii (n, n′ ) di(n ′ ), (52)

P(n, n′ ) = 1 N X N

i=1 R uv ii (n, n′ ). (53)

Neuron 0 therefore obeys

x0(n + 1) = (1 − δ) x0(n) + δ ξ0(n), (54)

v0(n + 1) = αs v0(n) − η u0(n) − X

n′∈Z A(n, n′ ) u0(n ′ ) + I v 0 (n), (55)

u0(n − 1) = αs u0(n) + η v0(n) + γs d0(n) X

n′∈Z P(n, n′ ) d0(n ′ ) v0(n ′ ) − I u 0 (n). (56)

Thus, the effect of the reservoir on neuron 0 is captured by the statistics of the neuronal cavity field ξ0(n) and by the two kernels A(n, n′ ) and P(n, n′ ). It remains to compute these quantities, which we now do self-consistently. Note that neuron 0 is statistically equivalent to any reservoir neuron. The normalized sums over the reservoir, in the covariance of ξ0(n) and in Eqs. (52)–(53), are therefore averages over the single-site Gaussian process just derived. We write ⟨·⟩x0 for the average over this process. The single-site problem has a one-way structure in which the neuronal dynamics of neuron 0, Eq. (54), do not involve the forward and backward fields and are those of the original dynamical mean-field theory \[1, 16\]. This mirrors the high-dimensional network, whose trajectory drives the

14


<!-- Page 15 -->

tangent dynamics but not vice versa. Specifically, the neuronal cavity field ξ0(n) is a zero-mean Gaussian process whose covariance is determined by the self-consistency condition

ξ0(n) ξ0(n ′ )  x0 = g 2 ϕ(x0(n)) ϕ(x0(n ′ ))  x0 . (57) The solution of Eq. (57) determines the statistics of the gain trajectories d0(n) = ϕ ′ (x0(n)), which then drive the forward and backward fields of neuron 0. For the forward and backward fields of neuron 0, we write the equations as a 2×2 block system, as in Eq. (30), but with time indices only. We collect the single-site sequences into the vectors

V0 = 

      . . . v0(1) v0(2) . . . 

      , U0 = 

      . . . u0(1) u0(2) . . . 

      , (58)

and likewise for the sources I v 0 and I u 0 . We define the bidiagonal matrix

L = 

      . . . . . . −αs 1 −αs 1 . . . . . . 

      , (59)

which acts as

(LV0)(n) = v0(n + 1) − αs v0(n), (60) (L TU0)(n) = u0(n − 1) − αs u0(n). (61)

We also let D0 denote the diagonal matrix with diagonal entries d0(n), A and P the matrices with entries A(n, n′ ) and P(n, n′ ), and I the identity on single-site sequences. The forward and backward equations of neuron 0 then read

ηI + A L −L T ηI + γs D0P D0 ! U0 V0 ! = I v 0 I u 0 ! . (62)

We write Rab 00(n, n′ ) for the responses of Eq. (62), which depend on the gain trajectory d0(n). Inverting Eq. (62) by blocks gives these responses in matrix form,

R vu 00 = h ηI + γs D0P D0 + L T (ηI + A) −1L i−1 , (63) R uv 00 = h ηI + A + L(ηI + γs D0P D0) −1L T i−1 , (64) R vv 00 = R vu 00 L T (ηI + A) −1 . (65) The kernels are then determined self-consistently by

A(n, n′ ) = γs d0(n) R vu 00 (n, n′ ) d0(n ′ )  x0 , (66a) P(n, n′ ) = R uv 00 (n, n′ )  x0 , (66b)

where d0(n) = ϕ ′ (x0(n)). Note that the gains d0(n) and d0(n ′ ) appear inside the average defining A(n, n′ ), but outside the average defining P(n, n′ ), where they instead multiply P(n, n′ ) in Eq. (62).

15


<!-- Page 16 -->

As η decreases, we follow the solution of Eq. (66) continuously from large η, where the kernels are small. The cumulative distribution is then read out from Eq. (36) as

F(s) = lim η→0+ ⟨R vv 00(k + 1, k)⟩x0 . (67)

The parameter s enters only through αs and γs. In the stationary state, the kernels A(n, n′ ) and P(n, n′ ), the gain correlations, and the averaged responses depend only on n − n ′ ; in particular, Eq. (67) does not depend on k. The responses Rab 00(n, n′ ) for a single gain trajectory, in contrast, depend on n and n ′ separately, because D0 is not translation invariant. The kernels are also symmetric, A(n, n′ ) = A(n ′ , n) and P(n, n′ ) = P(n ′ , n), since solving Eq. (30) by blocks gives the symmetric matrices Rvu = (ηI + KT K/η) −1 and Ruv = (ηI + KKT /η) −1 .

### 3 Results

3.1 Trivial fixed point and maximum Lyapunov exponent

We first check the single-site theory against two known results, the Lyapunov spectrum at the trivial fixed point and the maximum Lyapunov exponent in the chaotic phase. To our knowledge, these results have appeared in the literature only as δ → 0 and at δ = 1, but both extend directly to finite δ (Table 1). In both cases, the single-site theory simplifies and recovers the expected results. Details are given in Appendices A and B.

Table 1. Trivial fixed point and maximum Lyapunov exponent. The first row gives the region of eigenvalues µ of J in which λi < s at the trivial fixed point, so that F(s) is the fraction of the disk |µ| < g that lies in this region. The second row gives the maximum Lyapunov exponent λ1 in the chaotic phase.

finite δ δ → 0 δ = 1 Trivial fixed point, region with λi < s |µ − cδ| < rs Re µ < 1 + s |µ| < es Chaotic phase, λ1 s∗ −1 + √ 1 − E0 log g q Cd(0) 

At the trivial fixed point, xi(n) = 0, which is stable for g < 1, every gain is di(n) = 1, and the network is linear, with the constant Jacobian M(n) = (1 − δ)IN + δJ. The Lyapunov exponents are then λi = δ −1 log |1 − δ + δµi |, where µi are the eigenvalues of J. As N → ∞, these eigenvalues are uniform on the disk |µ| < g, by the circular law \[26–28\]. Thus, F(s) is the fraction of the disk |µ| < g that lies inside a second disk, |µ − cδ| < rs, in which λi < s, with cδ = 1 − δ −1 and rs = δ −1 e δs (Fig. 3a and Appendix A.1). As δ → 0, the second disk becomes the half-plane Re µ < 1 + s, and the density of Lyapunov exponents F ′ (s) reduces to the semicircle law noted by Engelken et al. \[22\] (Fig. 3b). At δ = 1, the two disks are concentric, and F(s) = e 2s/g2 for s < log g, as noted by Curato and Politi \[25\]. As expected, the single-site theory recovers this result. At the trivial fixed point, every gain is constant, and the gains are the only source of time dependence in the single-site problem. The single-site problem is therefore invariant under translations in time and can be solved in closed form by a Fourier transform in time. In an interpretation of this solution in two-dimensional electrostatics, F(s) is the fraction of a uniform charge on the disk |µ| < g enclosed by the circle |µ − cδ| = rs, by Gauss’s law. Thus, the single-site theory recovers the circular-law result for every δ (Fig. 3c and Appendices A.2 and A.2.1). The maximum Lyapunov exponent λ1, meanwhile, is known in two limits, in terms of the autocorrelation C d (τ ) = ⟨d0(n) d0(n ′ )⟩x0 of the gains at lag τ = (n − n ′ )δ. In continuous time,

16


<!-- Page 17 -->

δ → 0, Sompolinsky et al. \[1\] obtained λ1 = −1+ √ 1 − E0, where E0 is the ground-state energy of a Schrödinger operator with potential 1−g 2C d (τ ). At δ = 1, where the network has no leak, Molgedey

et al. \[20\] obtained λ1 = log g q Cd(0)  . Both results are limits of a single calculation at finite δ, in which dynamical mean-field theory is applied to two copies of the network (Appendix B.1). At finite δ, λ1 = s∗, where s∗ is the largest value of s at which 0 lies in the spectrum of a linear operator Ts, Eq. (B.8), which acts on functions of the lag τ and depends on s through αs and γs. Since Ts depends on s, finding s∗ is a nonlinear eigenvalue problem, which becomes linear as δ → 0, where s enters only through the energy of the Schrödinger operator. As δ → 0 and at δ = 1, s∗ reduces to the results of Sompolinsky et al. \[1\] and Molgedey et al. \[20\], respectively (Table 1, Fig. 4b,c, and Appendix B.1.1). Again, as expected, the single-site theory recovers this operator. Above the upper edge of the Lyapunov spectrum, where F(s) = 1, the kernels of the single-site theory vanish as η → 0 +, and the solution with vanishing kernels ceases to exist exactly where 0 enters the spectrum of Ts (Appendix B.2).

3.2 Numerical solution and simulations

To solve the single-site theory numerically, we iterate Eq. (66) on a periodic window of m steps, av eraging over gain trajectories sampled from the self-consistent Gaussian process for x0(n), Eq. (57), and we lower η toward zero in a few steps. For δ → 0, we solve the continuous-time limit of the single-site theory on a time grid. To validate the theory, we compare the numerical solution of the single-site theory, Eqs. (66) and (67), with simulations of the network, Eq. (5). In the simulations, we compute the Lyapunov spectrum with the QR method, which propagates a set of tangent vectors with the Jacobians M(n) and repeatedly reorthonormalizes them \[22, 23\]. For δ → 0, we integrate the continuous-time network and its tangent dynamics with the fourth-order Runge–Kutta method. Details of both computations are given in Appendix D.

3.3 Lyapunov spectra

Figure 1 shows the Lyapunov spectra for two values of g and several time steps δ. In the theory, the exponent at rank fraction i/N is the value of s at which 1 − F(s) = i/N, with F(s) given by Eq. (67). The theory and the simulations agree closely across the computed range of s.

3.4 Attractor dimension, entropy rate, and participation-ratio dimensions

At large N, sums over exponents become integrals over the density of exponents F ′ (s). Thus, the Kaplan–Yorke dimension, Eq. (3), and the entropy rate, given by the sum of the positive exponents (Sec. 1.2), are

DKY N = 1 − F(sKY), (68) hKS N = Z ∞ 0 s F′ (s) ds, (69)

where sKY < 0 solves R ∞ sKY s F′ (s) ds = 0. For comparison, we also compute the participation-ratio dimensions of the preactivations and the firing rates, which were the focus of earlier work \[30, 31\]. For a ∈ {x, ϕ}, with ϕi(n) = ϕ(xi(n)), let C a ij (τ ) = ai(n) aj (n ′ )  n , τ = (n − n ′ )δ, (70)

17


<!-- Page 18 -->

0.0 0.2 0.4 0.6 0.8 1.0 i/N −3 −2 −1 0 g = 3

δ = 0.05 δ = 0.1 δ = 0.25 δ = 0.5 (a)

theory simulation

0.00 0.01 0.02 0.03 0.04 0.05 0.06 0.07 i/N 0.00 0.05 0.10 0.15 0.20 0.25 g = 3 (b)

0.0 0.2 0.4 0.6 0.8 1.0 i/N −3 −2 −1 0 g = 5 (c)

0.00 0.01 0.02 0.03 0.04 0.05 0.06 0.07 i/N 0.0 0.1 0.2 0.3 0.4 g = 5 (d)

FIG. 1. Lyapunov spectra for δ = 0.05, 0.1, 0.25, and 0.5, with the legend in (a) for all panels. The exponents λi are plotted against the rank fraction i/N. Lines show the single-site theory, Eq. (67), as s against 1−F(s), ending at the upper edge s∗ (Appendix B.2), and dots show simulations of one network with N = 4096. (a) Full Lyapunov spectra for g = 3, with dots for every 100th Lyapunov exponent. (b) Positive Lyapunov exponents of (a), enlarged, with dots for every ∼10th Lyapunov exponent. (c) Same as (a) for g = 5. (d) Same as (b) for g = 5.

be the covariance at lag τ , where ⟨·⟩n denotes the average over n at fixed n − n ′ (the time averages of ai(n) vanish by the symmetry x → −x of the network). The participation ratio is

PRa =  PN i=1 C a ii(0) 2

PN i,j=1 Ca ij (0)2 , (71)

which is the participation-ratio dimension discussed in Sec. 1.5. At large N, the diagonal covariances C a ii(τ ) approach the single-site autocovariance C a (τ ) = ⟨a0(n) a0(n ′ )⟩x0 , with ϕ0(n) = ϕ(x0(n)). The off-diagonal covariances C a ij (τ ), i ̸= j, are O(N −1/2 ), but the N(N −1) off-diagonal covariances together contribute at the same order as the N diagonal covariances, through the four-point function

ψ a (τ1, τ2) = 1 N X N

i,j=1 i̸=j C a ij (τ1) C a ij (τ2), (72)

which concentrates to a value of order one as N → ∞. Thus, like DKY/N and hKS/N, PRa /N converges to a self-averaging value of order one, PRa /N → C a (0)2/  C a (0)2 + ψ a (0, 0)  . The four-point function ψ a (τ1, τ2) follows from the two-site cavity derivation of Clark et al. \[30\], in which two neurons are added to the reservoir, or equivalently from path-integral fluctuations \[31\]. The two-site cavity derivation carries over straightforwardly to finite time step δ (Appendix C).

18


<!-- Page 19 -->

1 10 20 g 0.000 0.025 0.050 0.075 0.100 0.125 0.150 0.175

δ→0 (a) DKY/N PR ϕ /N PR x /N theory simulation

1 10 20 g δ = 0.25 1 10 20 g δ = 0.5 1 5 10 15 20 g 0.000 0.005 0.010 0.015 0.020 0.025 0.030 0.035 (b) δ→0 δ = 0.25 δ = 0.5

FIG. 2. Attractor dimension, participation-ratio dimensions, and entropy rate as functions of the coupling strength g, with the line and marker legend in (a) for both panels. Lines show theory, and dots show simulations with N = 4096 (the median over five larger networks near the onset of chaos) for DKY/N and hKS/N and the mean over two networks with N = 16384 for PRϕ /N and PRx /N (Appendix D.2). (a) Kaplan–Yorke dimension DKY/N, Eq. (68), and participation ratios PRϕ /N and PRx /N, Eq. (71), for δ → 0, 0.25, and 0.5 (left to right). The theory is the single-site theory for DKY/N and the two-site cavity theory (Appendix C) for PRϕ /N and PRx /N. (b) Entropy rate hKS/N, Eq. (69), for δ → 0, 0.25, and 0.5, with the legend in the panel. The theory is the single-site theory.

Figure 2 shows the attractor dimension and the participation ratios (Fig. 2a) and the entropy rate (Fig. 2b) as functions of g for several time steps δ. The theory and the simulations again agree closely. At every time step, the two participation ratios and the entropy rate increase monotonically with g over the range of g shown, and the participation ratios grow more slowly at strong coupling, as also found numerically by Engelken et al. \[22\]. The attractor dimension saturates at strong coupling and, as found numerically \[22\], eventually decreases. Over the range of g shown, this decrease is visible at δ = 0.5, where the attractor dimension has a maximum near g = 10.

### 4 Discussion

We derived the full Lyapunov spectrum of a random neural network at large N. The derivation combines an exact identity at finite N, which expresses the cumulative distribution of Lyapunov exponents as the one-step response of the minimum-norm solution of the shifted tangent dynam ics, with a cavity calculation that reduces this response to a self-consistent single-site problem. The resulting theory agrees closely with simulations. Together with recent calculations of the participation-ratio dimension \[30, 31\], all of the quantities in Fig. 2 can now be computed from theory. The main assumption of the derivation is that the limit of large N and the limit of vanishing regularization can be exchanged. A more mathematical treatment would need to justify this ex change, along with other steps of the cavity calculation, a task beyond the expertise of the author. Such a treatment could also enable a formalization of the result in a proof assistant. The approach extends straightforwardly to rate networks with structure beyond i.i.d. couplings, such as networks with several populations of neurons, for example, separate excitatory and in hibitory populations; networks whose couplings have a low-rank component; and networks with correlations between reciprocal couplings Jij and Jji. One could also attempt an extension to

19


<!-- Page 20 -->

networks of spiking neurons. Beyond recurrent networks, it would be intriguing to compute the Lyapunov spectra of the reasoning dynamics of looped transformers \[49\] and of the dynamics of the weights of neural networks during learning \[58\].

### Acknowledgments

The author thanks Ashok Litwin-Kumar for proposing this problem as a target for AI-assisted solution and for insightful exchanges; Jacob Zavatone-Veth, Alexander van Meegen, and Jonathan Kadmon for enjoyable discussions at the 2026 Bernstein Conference; and Rainer Engelken for first introducing the author to Lyapunov spectra and their numerical computation. The author is supported by the Flatiron Institute, a division of the Simons Foundation.

### AI methodology

Initial derivation The author had previously assumed that the present problem was analytically intractable. The initial derivation of a self-consistent single-site problem whose solution matched large-N simulations was produced by GPT-6 Astra with Max thinking. The prompt below was given within an existing session in which the model had previously derived other results on the theory of random recurrent neural networks. The model then worked independently for 100 minutes following the prompt (typos corrected),

“Great work so far. Next task: Derive the full N → ∞ Lyapunov spectrum of the SCS model (see Engelken for numerics). Use whichever technique gets the result and is the most elegant/transparent. Ensure that your writeup is intelligible. Do not stop until you have nailed the answer. You must complete this task.”

That derivation was carried out for the continuous-time network. It shifted the Lyapunov exponents by s, as in this paper, and introduced the potential pN (s) = N −1 PN i=1 max(λi − s, 0), whose derivative with respect to s is F(s)−1. The central step was a theorem of Deninger \[55\] (Theorem 9). For a stationary ergodic sequence of invertible matrices, such as the Jacobians along a trajectory, this theorem equates the sum of the positive Lyapunov exponents with the Fuglede–Kadison log determinant of the operator that propagates tangent vectors along the trajectory. By taking the time step to zero in this theorem, the original derivation expressed pN (s), up to a term linear in s and a constant, as the Fuglede–Kadison log-determinant of the first-order time operator ∂t+1+s−JD(t), which acts on neuron and time indices. This log-determinant is defined with a positive regularizer that is taken to zero at the end. Differentiating with respect to s at fixed regularizer gave a regularized inverse of this time operator. The original derivation computed this regularized inverse by Hermitizing the time operator into a 2 × 2 block system and averaging over the Gaussian couplings with a matrix Dyson equation. It handled the dependence of the gains on the couplings by a Gaussian conditioning argument, which decouples the gains from the couplings in the product of Jacobians. In particular, conditioning on the network trajectory over a fixed time window replaces the couplings by independent Gaussian couplings plus a correction of rank at most the number of time steps, which does not affect F(s) as N → ∞. As in the present paper, the exchange of the large-N limit with the long-time and zero-regularizer limits was assumed. To relate the original derivation to the present paper, we restate its central step in the discrete time notation of Part 1 (Sec. 2.1). Applied to the shifted Jacobians Ms(n), Deninger’s theorem reads pN (s) = 1 Nδ log detFKK, (73)

20


<!-- Page 21 -->

where K is the matrix of Eq. (16). The Fuglede–Kadison log-determinant is

log detFKK = lim η→0+ lim m→∞ 1 2m log det KT mKm + η 2 ImN  , (74)

where Km is the part of K that acts on the tangent vectors v(2), . . . , v(m + 1),

Km =       IN

−Ms(2) IN . . . . . . −Ms(m) IN       . (75)

In this expression, the order of the limits is important. In particular, since Km is block lower triangular with IN on its diagonal, det Km = 1 for any Jacobians, so that taking η → 0 + first would give zero and lose all Lyapunov information. At fixed regularizer η, differentiating the regularized log-determinant in Eq. (74) with respect to s produces the regularized inverse (KT K + η 2 I) −1KT , which is the response Rvv(n, n′ ), Eq. (24), of the regularized solution, Eq. (23). As η → 0 +, the derivative of the right-hand side of Eq. (73) with respect to s thus reduces to F(s) − 1, through the one-step response of Eq. (22), and therefore equals the derivative of pN (s). Since both sides of Eq. (73) vanish as s → ∞, the two sides agree for every s.

Route to the present paper The author found this derivation intriguing, albeit complicated and somewhat mysterious, since Deninger’s theorem, particularly in its continuous-time form, gave no direct picture of why the 2 × 2 block system, as the regularizer vanishes, counts the Lyapunov exponents below s. On examining it together with GPT-6 Astra (occasionally switched to a less advanced model, such as GPT-5.6 Sol) and Claude Opus 5.5, the author found that the potential, the log-determinant, and Deninger’s theorem could all be bypassed in favor of the physical core of the calculation, namely, the minimum-norm solution of the underdetermined tangent-space propa gation problem. This solution directly gives the cumulative distribution as the normalized trace of a one-step response matrix, the projector onto the decaying directions (Part 1, Sec. 2.1), obtained by propagating the decaying component of the source forward in time and the growing component backward in time. Deninger’s log-determinant encodes the same split, since the growing directions, which must be propagated backward, are those that contribute their exponents. Indeed, Part 1, together with the differentiation above, gives an elementary derivation of Deninger’s theorem in this setting. In this picture, each element of the original derivation acquires a physical meaning. The reg ularizer selects the minimum-norm solution as it is taken to zero, and the 2 × 2 block system is the forward–backward system of the corresponding least-squares problem (Part 2, Sec. 2.2). The present derivation also replaces the Gaussian-conditioning argument and the matrix Dyson equa tion with a cavity calculation applied jointly to the network and the forward–backward system (Part 3, Sec. 2.3). In the cavity calculation, the couplings of the added neuron are independent of the reservoir by construction, so that the dependence of the gains on the couplings is handled by the order-of-magnitude estimates of Part 3, and the network dynamics and the forward–backward system reduce together to a single-site problem, as in dynamical mean-field theory. Finally, the present derivation treats the Euler discretization with a finite time step δ. In the continuous-time limit δ → 0, the resulting single-site equations coincide with those of the original derivation.

Code, figures, and text Under the direction of the author, Claude Opus 5.5 wrote all code, both for the numerical solution of the theory and for the network simulations, generated all figures,

21


<!-- Page 22 -->

and checked the steps of the derivation numerically. Claude Opus 5.5 was also used to revise the text and to write initial drafts of some technical passages.

22


<!-- Page 23 -->

### References

\[1\] Haim Sompolinsky, Andrea Crisanti, and Hans-Jürgen Sommers. Chaos in random neural networks. Physical Review Letters, 61(3):259, 1988.

\[2\] Lai-Sang Young. What are SRB measures, and which dynamical systems have them? Journal of Statistical Physics, 108(5):733–754, 2002.

\[3\] Valery Iustinovich Oseledets. A multiplicative ergodic theorem: Characteristic Ljapunov expo nents of dynamical systems. Trudy Moskovskogo Matematicheskogo Obshchestva, 19:179–210, 1968.

\[4\] James L. Kaplan and James A. Yorke. Chaotic behavior of multidimensional difference equa tions. In Heinz-Otto Peitgen and Hans-Otto Walther, editors, Functional Differential Equa tions and Approximation of Fixed Points, volume 730 of Lecture Notes in Mathematics, pages 204–227. Springer, Berlin, Heidelberg, 1979. doi: 10.1007/BFb0064319.

\[5\] Paul Frederickson, James L Kaplan, Ellen D Yorke, and James A Yorke. The Liapunov dimension of strange attractors. Journal of Differential Equations, 49(2):185–207, 1983.

\[6\] Lai-Sang Young. Dimension, entropy and Lyapunov exponents. Ergodic Theory and Dynamical Systems, 2(1):109–124, 1982.

\[7\] François Ledrappier and Lai-Sang Young. The metric entropy of diffeomorphisms: part II: Relations between entropy, exponents and dimension. Annals of Mathematics, 122(3):540– 574, 1985.

\[8\] Andrei Nikolaevich Kolmogorov. A new metric invariant of transient dynamical systems and authomorphisms in Lebesgue spaces. In Dokl. Akad. Nauk SSSR (NS), volume 119, page 861, 1958.

\[9\] Yakov G Sinai. On the notion of entropy of a dynamical system. In Doklady of Russian Academy of Sciences, volume 124, pages 768–771, 1959.

\[10\] David Ruelle. An inequality for the entropy of differentiable maps. Boletim da Sociedade Brasileira de Matemática-Bulletin/Brazilian Mathematical Society, 9(1):83–87, 1978.

\[11\] François Ledrappier and Lai-Sang Young. The metric entropy of diffeomorphisms: part I: Characterization of measures satisfying Pesin’s entropy formula. Annals of Mathematics, 122 (3):509–539, 1985.

\[12\] Ya B Pesin. Characteristic Lyapunov exponents and smooth ergodic theory. Russian Mathe matical Surveys, 32(4):55–114, 1977.

\[13\] Francesca Mastrogiuseppe and Srdjan Ostojic. Linking connectivity, dynamics, and computa tions in low-rank recurrent neural networks. Neuron, 99(3):609–623, 2018.

\[14\] David Sussillo and Larry F Abbott. Generating coherent patterns of activity from chaotic neural networks. Neuron, 63(4):544–557, 2009.

\[15\] Laura N Driscoll, Krishna Shenoy, and David Sussillo. Flexible multitask computation in recurrent networks utilizes shared dynamical motifs. Nature Neuroscience, 27(7):1349–1363, 2024.

23


<!-- Page 24 -->

\[16\] A Crisanti and H Sompolinsky. Path integral approach to random neural networks. Physical Review E, 98(6):062120, 2018.

\[17\] Jonathan Kadmon and Haim Sompolinsky. Transition to chaos in random neuronal networks. Physical Review X, 5(4):041030, 2015.

\[18\] Jannis Schuecker, Sven Goedeke, and Moritz Helias. Optimal sequence memory in driven random networks. Physical Review X, 8(4):041029, 2018.

\[19\] Rainer Engelken, Alessandro Ingrosso, Ramin Khajeh, Sven Goedeke, and LF Abbott. Input correlations impede suppression of chaos and learning in balanced firing-rate networks. PLoS computational biology, 18(12):e1010590, 2022.

\[20\] Lutz Molgedey, Johannes Schuchhardt, and Heinz G Schuster. Suppressing chaos in neural networks by noise. Physical Review Letters, 69(26):3717, 1992.

\[21\] Bruno Cessac. Increase in complexity in random neural networks. Journal de Physique I, 5 (3):409–432, 1995.

\[22\] Rainer Engelken, Fred Wolf, and Larry F Abbott. Lyapunov spectra of chaotic recurrent neural networks. Physical Review Research, 5(4):043044, 2023.

\[23\] Giancarlo Benettin, Luigi Galgani, Antonio Giorgilli, and Jean-Marie Strelcyn. Lyapunov characteristic exponents for smooth dynamical systems and for Hamiltonian systems; a method for computing all of them. Part 1: Theory. Meccanica, 15(1):9–20, 1980.

\[24\] David Ruelle. Large volume limit of the distribution of characteristic exponents in turbulence. Communications in Mathematical Physics, 87(2):287–302, 1982.

\[25\] Gianbiagio Curato and Antonio Politi. Onset of chaotic dynamics in neural networks. Physical Review E, 88(4):042908, 2013.

\[26\] Jean Ginibre. Statistical ensembles of complex, quaternion, and real matrices. Journal of Mathematical Physics, 6(3):440–449, 1965.

\[27\] Vyacheslav L Girko. Circular law. Theory of Probability & Its Applications, 29(4):694–706, 1985.

\[28\] Hans Juergen Sommers, Andrea Crisanti, Haim Sompolinsky, and Yaakov Stein. Spectrum of large random asymmetric matrices. Physical Review Letters, 60(19):1895, 1988.

\[29\] Ashok Litwin-Kumar, Kameron Decker Harris, Richard Axel, Haim Sompolinsky, and LF Ab bott. Optimal degrees of synaptic connectivity. Neuron, 93(5):1153–1164, 2017.

\[30\] David G Clark, LF Abbott, and Ashok Litwin-Kumar. Dimension of activity in random neural networks. Physical Review Letters, 131(11):118401, 2023.

\[31\] David G Clark, Owen Marschall, Alexander Van Meegen, and Ashok Litwin-Kumar. Connec tivity structure and dynamics of nonlinear recurrent neural networks. Physical Review X, 15 (4):041019, 2025.

\[32\] Mehrdad Jazayeri and Srdjan Ostojic. Interpreting neural computations by examining intrinsic and embedding dimensionality of neural activity. Current Opinion in Neurobiology, 70:113– 120, 2021.

24


<!-- Page 25 -->

\[33\] Yu Hu and Haim Sompolinsky. The spectrum of covariance matrices of randomly connected re current neuronal networks with linear dynamics. PLoS Computational Biology, 18(7):e1010327, 2022.

\[34\] Jacob A Zavatone-Veth. Stationary covariance spectra of discrete-time non-normal random recurrent dynamics. arXiv preprint arXiv:2606.31944, 2026.

\[35\] Xuanyu Shen and Yu Hu. Covariance spectrum in nonlinear recurrent neural networks. arXiv preprint arXiv:2508.05288, 2025.

\[36\] Albert J. Wakhloo. Solution of a chaotic neural network at fixed connectivity. arXiv preprint arXiv:2604.24141, 2026.

\[37\] David G Clark. Linear equivalence of nonlinear recurrent neural networks. arXiv preprint arXiv:2604.23489, 2026.

\[38\] Michael Monteforte and Fred Wolf. Dynamical entropy production in spiking neuron networks in the balanced state. Physical Review Letters, 105(26):268104, 2010.

\[39\] Michael Monteforte and Fred Wolf. Dynamic flux tubes form reservoirs of stability in neuronal circuits. Physical Review X, 2(4):041007, 2012.

\[40\] Guillaume Lajoie, Kevin K Lin, and Eric Shea-Brown. Chaos and reliability in balanced spiking networks with temporal drive. Physical Review E, 87(5):052901, 2013.

\[41\] Guillaume Lajoie, Jean-Philippe Thivierge, and Eric Shea-Brown. Structured chaos shapes spike-response noise entropy in balanced neural networks. Frontiers in Computational Neuro science, 8:123, 2014.

\[42\] Rainer Engelken, Michael Monteforte, and Fred Wolf. Sparse chaos in cortical circuits. arXiv preprint arXiv:2412.21188, 2024.

\[43\] Rüdiger Zillmer, Roberto Livi, Antonio Politi, and Alessandro Torcini. Desynchronization in diluted neural networks. Physical Review E, 74(3):036203, 2006.

\[44\] Kazumasa A Takeuchi, Francesco Ginelli, and Hugues Chaté. Lyapunov analysis captures the collective dynamics of large chaotic systems. Physical Review Letters, 103(15):154103, 2009.

\[45\] Ben Poole, Subhaneil Lahiri, Maithra Raghu, Jascha Sohl-Dickstein, and Surya Ganguli. Ex ponential expressivity in deep neural networks through transient chaos. Advances in Neural Information Processing Systems, 29, 2016.

\[46\] Samuel S. Schoenholz, Justin Gilmer, Surya Ganguli, and Jascha Sohl-Dickstein. Deep infor mation propagation. In International Conference on Learning Representations, 2017. URL https://openreview.net/forum?id=H1W1UN9gg.

\[47\] Aditya Cowsik, Tamra Nebabu, Xiaoliang Qi, and Surya Ganguli. Geometric dynamics of signal propagation predict trainability of transformers. Physical Review E, 112(5):055301, 2025.

\[48\] Rainer Engelken. Gradient flossing: Improving gradient descent through dynamic control of Jacobians. Advances in Neural Information Processing Systems, 36:10412–10439, 2023.

25


<!-- Page 26 -->

\[49\] Jeffrey Lai, Anthony Bao, John Quinn, and William Gilpin. Fractal basins trap latent reason ing. arXiv preprint arXiv:2609.04963, 2026.

\[50\] Wes Gurnee, Nicholas Sofroniew, Adam Pearce, Mateusz Piotrowski, Isaac Kauvar, Runjin Chen, Anna Soligo, Paul Bogdan, Euan Ong, Rowan Wang, T. Ben Thompson, David Abra hams, Subhash Kantamneni, Emmanuel Ameisen, Joshua Batson, and Jack Lindsey. Ver balizable representations form a global workspace in language models. Transformer Circuits Thread, 2026. URL https://transformer-circuits.pub/2026/workspace/index.html.

\[51\] Thorsten Hüls. Numerical computation of dichotomy rates and projectors in discrete time. Discrete Contin. Dyn. Syst. Ser. B, 12(1):109–131, 2009.

\[52\] Gary Froyland, Thorsten Hüls, Gary P Morriss, and Thomas M Watson. Computing covariant Lyapunov vectors, Oseledets vectors, and dichotomy projectors: A comparative numerical study. Physica D: Nonlinear Phenomena, 247(1):18–39, 2013.

\[53\] Robert J Sacker and George R Sell. A spectral theory for linear differential systems. Journal of Differential Equations, 27(3):320–358, 1978.

\[54\] Thorsten Hüls. Computing Sacker–Sell spectra in discrete time dynamical systems. SIAM Journal on Numerical Analysis, 48(6):2043–2064, 2010.

\[55\] Christopher Deninger. Determinants on von Neumann algebras, Mahler measures and Ljapunov exponents. Journal für die reine und angewandte Mathematik, 651:165–185, 2011. doi: 10.1515/crelle.2011.012. URL https://doi.org/10.1515/crelle.2011.012. arXiv:0712.0667.

\[56\] Joshua Feinberg and Anthony Zee. Non-Hermitian random matrix theory: Method of Hermi tian reduction. Nuclear Physics B, 504(3):579–608, 1997.

\[57\] Marc Potters and Jean-Philippe Bouchaud. A first course in random matrix theory: for physicists, engineers and data scientists. Cambridge University Press, 2021.

\[58\] Mitchell Ostrow, Adam Eisen, Leo Kozachkov, and Ila Fiete. Beyond geometry: Comparing the temporal structure of computation in neural circuits with dynamical similarity analysis. Advances in Neural Information Processing Systems, 36:33824–33837, 2023.

\[59\] Robert Price. A useful theorem for nonlinear devices having Gaussian inputs. IRE Transactions on Information Theory, 4(2):69–72, 1958.

26


<!-- Page 27 -->

### Appendix A Lyapunov spectrum at the trivial fixed point

This appendix gives the details of the Lyapunov spectrum at the trivial fixed point (rather than along a chaotic trajectory), summarized in Sec. 3.1. We first obtain the Lyapunov spectrum directly from the circular law of eigenvalues of J (Appendix A.1). We then show that the single-site theory derived in this paper recovers this Lyapunov spectrum (Appendices A.2 and A.2.1).

A.1 Lyapunov spectrum at the trivial fixed point from the circular law

For g < 1, the fixed point xi(n) = 0 of the network is stable. At this fixed point, every gain is di(n) = ϕ ′ (0) = 1, so the Jacobian is constant, M(n) = (1−δ)IN +δJ, with eigenvalues 1−δ +δµi , where µi are the eigenvalues of J. For a constant Jacobian, the mth roots of the singular values of the product M(m)· · · M(1) converge, as m → ∞, to the moduli of the eigenvalues of M(n), so that the Lyapunov exponents are

λi = 1 δ log |1 − δ + δµi |. (A.1)

The condition λi < s is equivalent to |µi − cδ| < rs, (A.2)

with

cδ = 1 − 1 δ , (A.3)

rs = e δs δ . (A.4)

As N → ∞, the eigenvalues µi are uniform on the disk |µ| < g, by the circular law \[26–28\]. The fraction of exponents below s is therefore the fraction of the disk |µ| < g that lies inside the disk |µ − cδ| < rs. We call the region in which the two disks overlap the overlap region (Fig. 3a). Thus,

F(s) = 1 πg2 Area {µ ∈ C : |µ| < g and |µ − cδ| < rs} . (A.5)

As δ → 0, Eq. (A.1) gives λi → −1 + Re µi , (A.6) the real parts of the eigenvalues of the continuous-time Jacobian −IN + J. Correspondingly, the center cδ of the circle |µ − cδ| = rs moves to −∞, while the rightmost point of this circle, µ = cδ + rs = 1 + s + O(δ), converges to 1 + s, so that, near the disk |µ| < g, the disk |µ − cδ| < rs becomes the half-plane Re µ < 1 + s (Fig. 3b). Thus, as δ → 0, F(s) is the fraction of the disk |µ| < g with Re µ < 1 + s,

F(s) = 2 πg2 Z 1+s

−g q g 2 − x 2 dx, |1 + s| < g, (A.7)

where the integrand, the projection of the uniform distribution on the disk |µ| < g onto the real axis, is the semicircle law noted by Engelken et al. \[22\]. At δ = 1, where the network has no leak, Eq. (A.1) gives

λi = log |µi |, (A.8)

27


<!-- Page 28 -->

−2 −1 0 1 Reμ −1.5 −1.0 −0.5 0.0 0.5 1.0 1.5 |μ − cδ| = rs

|μ(θ)| < g overlap region μ(θ)

cδ rs |μ| = g (a)

θ

−1 0 1 Reμ −1.5 −1.0 −0.5 0.0 0.5 1.0 1.5 Reμ = 1 + s

|μ| = g δ = 0.5 δ = 0.2 δ = 0.05 δ→0 (b)

−3 −2 −1 0 s 0.0 0.2 0.4 0.6 0.8 1.0 (c) theory simulation

FIG. 3. Trivial fixed point, g = 0.8. (a) Eigenvalues µi of J for one network with N = 2000 (dots), the circle |µ| = g, and the circle |µ − cδ| = rs for δ = 0.5 and s = −0.6. Shading marks the overlap region of the disks |µ| < g and |µ − cδ| < rs, Eq. (A.5). The point µ(θ) = cδ + rse iθ moves along the circle |µ − cδ| = rs as θ varies. The thick arc, where |µ(θ)| < g, is the band of frequencies |Lˆ(θ)| 2 < γs of the single-site solution (Appendix A.2.1). (b) Circles |µ − cδ| = rs for δ = 0.5, 0.2, and 0.05 at s = −0.6, with the legend in the panel, and the eigenvalues and the circle |µ| = g as in (a). As δ → 0, the circle |µ − cδ| = rs approaches the line Re µ = 1 + s (dashed). (c) Cumulative distribution F(s) for the values of δ in (b), with the legend of (b). Lines show the single-site theory, Eq. (A.25), which coincides with the circular-law result, Eq. (A.5), and dots show the fraction of the exponents of Eq. (A.1) below s for the network in (a). The dashed line shows the δ → 0 limit, Eq. (A.7).

the logarithms of the moduli of the eigenvalues of J. Correspondingly, cδ = 0 and rs = e s , so that the disks |µ| < g and |µ| < es are concentric. Thus, at δ = 1, F(s) is the fraction of the disk |µ| < g with |µ| < es , F(s) = e 2s

g 2 , s < log g, (A.9)

as obtained by Curato and Politi \[25\].

### A.2 Lyapunov spectrum from the single-site theory

We now show that the single-site theory recovers the Lyapunov spectrum of Eq. (A.5). In the single site theory, x0(n) = 0 solves the mean-field theory, Eq. (57), since ϕ(0) = 0. Thus, d0(n) = 1, D0 = I, and the averages ⟨·⟩x0 are trivial. Equation (66) becomes A(n, n′ ) = γsRvu 00 (n, n′ ) and P(n, n′ ) = Ruv 00 (n, n′ ), and we look for a solution in which all matrices in Eqs. (63)–(66) have entries that depend only on n − n ′ . For such a matrix Z, we use the Fourier representation

Z(n, n′ ) = Z π

−π dθ 2π Zˆ(θ) e iθ(n−n ′ ) . (A.10)

Products of such matrices become products of the functions Zˆ(θ), and inverses become reciprocals. For L and L T ,

Lˆ(θ) = e iθ − αs, (A.11)

LcT (θ) = e −iθ − αs, (A.12)

28

<!-- Image omitted -->

<!-- Image omitted -->


<!-- Page 29 -->

so that Lˆ(θ)LcT (θ) = |Lˆ(θ)| 2 . Since the kernels are symmetric (Sec. 2.3), Aˆ(θ) and Pˆ(θ) are real. We define

X(θ) = η + Aˆ(θ), (A.13)

Y (θ) = η + γsPˆ(θ), (A.14)

Q(θ) = X(θ) Y (θ) + |Lˆ(θ)| 2 . (A.15) Equations (63)–(65) then give

Rˆvu 00 (θ) = X(θ) Q(θ) , (A.16)

Rˆuv 00 (θ) = Y (θ) Q(θ) , (A.17)

Rˆvv 00(θ) = e −iθ − αs Q(θ) . (A.18)

The self-consistency conditions, Aˆ(θ) = γsRˆvu 00 (θ) and γsPˆ(θ) = γsRˆuv 00 (θ), read

X(θ)  1 − γs Q(θ)  = η, (A.19)

Y (θ)  1 − γs Q(θ)  = η. (A.20)

The right sides are η > 0, so the factor 1 − γs/Q(θ) on the left sides cannot vanish, and dividing the two equations gives X(θ) = Y (θ), so that Q(θ) = X(θ) 2 + |Lˆ(θ)| 2 . Since A(n, n′ ) is positive

semidefinite, as the response Rvu = (ηI + η −1KT K) −1 of Eq. (30) is positive definite, X(θ) = η + Aˆ(θ) ≥ η. Thus, X(θ) is the positive root of

X(θ) " 1 − γs X(θ) 2 + |Lˆ(θ)| 2 # = η. (A.21)

As η → 0 +, this root behaves differently inside and outside the band of frequencies where |Lˆ(θ)| 2 <

γs,

X(θ) 2 → ( γs − |Lˆ(θ)| 2 , |Lˆ(θ)| 2 < γs,

0, |Lˆ(θ)| 2 > γs, (A.22)

Q(θ) → ( γs, |Lˆ(θ)| 2 < γs, |Lˆ(θ)| 2 , |Lˆ(θ)| 2 > γs. (A.23)

The readout, Eq. (67), is

F(s) = lim η→0+ Z π

−π dθ 2π e iθ Rˆvv 00(θ) = lim η→0+ Z π

−π dθ 2π 1 − αse iθ Q(θ) . (A.24)

Outside the band, (1 − αse iθ)/|Lˆ(θ)| 2 = 1/(1 − αse −iθ). Dropping the parts of the integrand that are odd in θ, we obtain

F(s) = Z

|Lˆ(θ)| 2<γs dθ 2π 1 − αs cos θ

γs + Z

|Lˆ(θ)| 2>γs dθ 2π Re 1 1 − αse−iθ . (A.25)

29


<!-- Page 30 -->

A.2.1 Electrostatic interpretation

To show that Eq. (A.25) coincides with Eq. (A.5), we interpret Eq. (A.25) in two-dimensional electrostatics, as is common for the eigenvalue densities of non-Hermitian random matrices \[28\]. We first parametrize the circle |µ − cδ| = rs by an angle around cδ,

µ(θ) = cδ + rse iθ . (A.26)

This angle is the frequency θ of Eq. (A.25), because cδ = −αs/βs and rs = 1/βs, by Eqs. (11) and (12), so that βs µ(θ) = e iθ − αs = Lˆ(θ), (A.27)

and therefore |Lˆ(θ)| 2 = β 2 s |µ(θ)| 2 . Since γs = β 2 s g 2 , the band |Lˆ(θ)| 2 < γs consists of the angles at

which |µ(θ)| < g (thick arc in Fig. 3a). In terms of µ(θ), the two integrands of Eq. (A.25) are

1 − αs cos θ

γs = Im  µ¯(θ) µ ′ (θ) 

g 2 , |µ(θ)| < g, (A.28)

Re 1 1 − αse−iθ = Im µ ′ (θ)

µ(θ) , |µ(θ)| > g. (A.29)

Therefore,

F(s) = Z π

−π dθ 2π Im  G(µ(θ)) µ ′ (θ)  = 1 2π Im I |µ−cδ|=rs G(µ) dµ, (A.30)

with G(µ) = ( µ/g ¯ 2 , |µ| ≤ g, 1/µ, |µ| > g. (A.31)

The real and imaginary parts of G(µ) are the components Ex(µ) and −Ey(µ) of the electric field in a two-dimensional electrostatics problem sourced by the eigenvalues, with the real and imaginary parts of µ = x + iy as the coordinates x and y. In this problem, a unit point charge at ν produces at µ the field Ex(µ) − iEy(µ) = 1 µ − ν . (A.32)

Spreading a unit total charge uniformly over the disk |ν| < g, as the eigenvalues are spread for N → ∞, and integrating this field over the disk gives

Ex(µ) − iEy(µ) = 1 πg2 Z |ν|<g d 2ν

µ − ν = G(µ). (A.33)

With dµ = dx + i dy, Im\[G(µ) dµ\] = Ex(µ) dy − Ey(µ) dx is the flux of the electric field through the line element dµ. By Eq. (A.30), 2πF(s) is therefore the flux of the electric field through the circle |µ − cδ| = rs. By Gauss’s law, this flux is 2π times the charge enclosed by the circle |µ − cδ| = rs,

since a point charge q contributes a flux 2πq if the point charge lies inside the circle |µ − cδ| = rs and 0 otherwise. The enclosed charge is the fraction of the disk |µ| < g that lies inside the disk |µ − cδ| < rs, which is Eq. (A.5). Thus, the single-site theory recovers the Lyapunov spectrum of Eq. (A.5) for every δ (Fig. 3c), and therefore also the semicircle law as δ → 0.

30


<!-- Page 31 -->

### Appendix B Maximum Lyapunov exponent

This appendix gives the details of the maximum Lyapunov exponent, summarized in Sec. 3.1. The maximum Lyapunov exponent λ1 is the rate at which two nearby trajectories of the same network separate, for a generic displacement between them. At large N, this rate follows from dynamical mean-field theory applied to two copies of the network, as in Crisanti and Sompolinsky \[16\] for δ → 0 and Molgedey et al. \[20\] for δ = 1. We first carry out this calculation at finite δ. The calculation shows that λ1 is determined by a linear operator Ts (Appendix B.1). We then evaluate λ1 in limiting cases (Appendix B.1.1). Finally, and most importantly, we show that the single-site theory derived in this paper recovers this maximum Lyapunov exponent (Appendix B.2). Throughout, we use the single-site autocovariance C x (τ ) (Sec. 3.4) and the gain autocorrelation C d (τ ) (Sec. 3.1) at the physical lag τ = (n − n ′ )δ.

B.1 Maximum Lyapunov exponent from two copies of the network

Consider two copies of the network, x (1) i (n) and x (2) i (n), with the same couplings Jij and dif ferent initial conditions. At large N, the squared distance per neuron between the two copies, N −1 PN i=1\[x (1) i (n) − x (2) i (n)\]2 , is self-averaging. For nearby copies, this squared distance grows at the rate 2λ1, which we now compute following Engelken et al. \[19\]. The cavity argument of Sec. 2.3, applied to both copies, gives, for neuron 0,

x (1) 0 (n + 1) = (1 − δ) x (1) 0 (n) + δ ξ(1) 0 (n), (B.1)

x (2) 0 (n + 1) = (1 − δ) x (2) 0 (n) + δ ξ(2) 0 (n), (B.2)

where the neuronal cavity fields ξ (1) 0 (n) and ξ (2) 0 (n) are jointly Gaussian. We write ⟨·⟩ x (1) 0 ,x (2) 0 for the average over this joint process. Each copy separately obeys the mean-field theory of Eq. (57), and the cross covariance of the two neuronal cavity fields is D ξ (1) 0 (n) ξ (2) 0 (n ′ ) E x (1) 0 ,x (2) 0 = g 2 D ϕ(x (1) 0 (n)) ϕ(x (2) 0 (n ′ )) E x (1) 0 ,x (2) 0 . (B.3)

Applying the update of the first copy to the first time argument and the update of the second copy to the second time argument, the cross covariance C 12(n, n′ ) = D x (1) 0 (n) x (2) 0 (n ′ ) E x (1) 0 ,x (2) 0 obeys

C 12(n + 1, n′ + 1) − (1 − δ)  C 12(n, n′ + 1) + C 12(n + 1, n′ )  + (1 − δ) 2C 12(n, n′ )

= δ 2 g 2 D ϕ(x (1) 0 (n)) ϕ(x (2) 0 (n ′ )) E x (1) 0 ,x (2) 0 . (B.4)

Identical copies give the solution C 12(n, n′ ) = C x (τ ). For nearby copies, we write C 12(n, n′ ) = C x (τ ) + ψ(n, n′ ), so that the mean squared distance between the two copies of neuron 0, which equals the squared distance per neuron, is D x (1) 0 (n) − x (2) 0 (n) 2 E x (1) 0 ,x (2) 0 = −2ψ(n, n). (B.5)

To first order in ψ(n, n′ ), only the covariance of the jointly Gaussian variables x (1) 0 (n) and x (2) 0 (n ′ ) changes, so, by Price’s theorem \[59\], the right side of the equation for C 12(n, n′ ) changes by δ 2 g 2C d (τ ) ψ(n, n′ ). Thus, ψ(n, n′ ) obeys the linear equation

ψ(n + 1, n′ + 1) − (1 − δ)  ψ(n, n′ + 1) + ψ(n + 1, n′ )  + (1 − δ) 2ψ(n, n′ ) = δ 2 g 2C d (τ ) ψ(n, n′ ). (B.6)

31


<!-- Page 32 -->

−1 0 1 s −1.5 −1.0 −0.5 0.0 0.5 continuum su

s\*

b(s)

g = 3, δ = 0.5 (a)

−0.2

0

s\*

0.4 s

−10 −5 0 5 10 τ −1.0 −0.8 −0.6 −0.4 −0.2 0.0 0.2 0.4 continuum

1 − g 2C d (τ) E0 = −0.526 E1 = 0 g = 3, δ→0 (b)

ψ0(τ) ψ1(τ) C x0 (τ)

1 2 5 10 20 g 0.0 0.2 0.4 0.6 0.8 1.0 1.2 (c) δ→0 δ = 0.25 δ = 0.5 δ = 1

theory simulation

FIG. 4. Maximum Lyapunov exponent from the operator Ts, Eq. (B.8). (a) Low-lying spectrum of α −1 s Ts, whose eigenvalues have the same signs as those of Ts, as a function of s for g = 3 and δ = 0.5. The thick line shows the lowest value b(s) of the spectrum, and the thin lines show excited eigenvalues below the continuum (shading). The dashed line marks su = δ −1 log(1 − δ), and the filled circle marks the zero crossing s∗ of b(s). The first excited eigenvalue crosses zero close to s = 0 (open circle), the finite-δ counterpart of the zero mode C x′ (τ ) in (b). (b) Schrödinger problem of the limit δ → 0, Eq. (B.13), for g = 3. The line labeled 1−g 2C d (τ ) shows the potential of H, Eq. (B.11), and the shading shows the continuum of H, above 1 − g 2 ⟨d0(n)⟩ 2 x0 . The bound states ψ0(τ ) and ψ1(τ ) of H, with the legend in the panel, are drawn at their energies E0 and E1 (dashed lines), and dots show C x′ (τ ), which is an eigenfunction of H with energy zero \[1\], normalized like ψ1(τ ). The right axis gives the exponent s = −1 + √ 1 − E that corresponds to the energy E, so that the ground state gives s∗ = −1 + √ 1 − E0, and the zero mode C x′ (τ ), with E1 = 0, corresponds to s = 0. (c) Maximum Lyapunov exponent λ1 as a function of g for δ → 0, 0.25, 0.5, and 1, with the legend in the panel. Lines show s∗ from Ts, and dots show simulations with N = 4096 (larger networks near the onset of chaos for δ < 1; Appendix D.2).

We look for solutions that grow exponentially at a rate s, ψ(n, n′ ) = e δs(n+n ′ )ψ(τ ), for which the squared distance −2ψ(n, n) grows as e 2δsn, so that the distance grows at the rate s. Inserting this form, dividing by e δs(n+n ′+2), and using αs = (1 − δ)e −δs and γs = δ 2 g 2 e −2δs gives

(Tsψ)(τ ) = 0, (B.7)

where the linear operator Ts acts on functions ψ(τ ) of the lag as

(Tsψ)(τ ) = 1 + α 2 s  ψ(τ ) − αs  ψ(τ + δ) + ψ(τ − δ)  − γs C d (τ ) ψ(τ ). (B.8)

A small initial separation gives a perturbation ψ(n, n′ ) that is bounded in τ . Thus, the distance can grow at the rate s only if Eq. (B.7) has a solution ψ(τ ) that does not grow at large |τ |. Such a solution exists exactly when 0 lies in the spectrum of Ts acting on bounded functions of τ . The distance between the copies grows at the largest such rate. Thus,

λ1 = s∗, (B.9)

where s∗ is the largest value of s at which 0 lies in the spectrum of Ts.

B.1.1 Limiting cases

We evaluate s∗ in two limiting cases. First, as δ → 0, we expand ψ(τ ± δ) = ψ(τ ) ± δψ′ (τ ) + 1 2 δ 2ψ ′′(τ ) + O(δ 3 ), αs = 1 − δ(1 + s) + O(δ 2 ), and γs = δ 2 g 2 + O(δ 3 ). The terms of order 1 and δ

32


<!-- Page 33 -->

in Eq. (B.8) cancel, since 1 + α 2 s − 2αs = (1 − αs) 2 = δ 2 (1 + s) 2 + O(δ 3 ), and Eq. (B.8) becomes

(Tsψ)(τ ) = δ 2  (Hψ)(τ ) − E ψ(τ )  + O(δ 3 ), (B.10)

with

H = − d 2 dτ 2 + 1 − g 2C d (τ ), (B.11)

E = 1 − (1 + s) 2 . (B.12) Equation (B.7) thus becomes the Schrödinger equation

(Hψ)(τ ) = E ψ(τ ). (B.13)

The operator H does not depend on s, and all of the dependence on s is in the energy E. Thus, 0 lies in the spectrum of Ts when E lies in the spectrum of H. As s increases from −1, E decreases from 1. The largest s at which E lies in the spectrum of H is therefore reached when E reaches the lowest value of this spectrum, the ground-state energy E0, which lies below 1, since the potential 1 − g 2C d (τ ) is less than 1 everywhere (Fig. 4b). Thus,

s∗ = −1 + p 1 − E0, (B.14)

which is the known result \[1\]. Second, at δ = 1, where the network has no leak, αs = 0, and Ts multiplies by 1 − g 2 e −2sC d (τ ). The eigenfunctions of Ts are then concentrated at single lags τ , with eigenvalues 1 − g 2 e −2sC d (τ ). Since C d (τ ) is largest at τ = 0, the largest s at which one of these eigenvalues vanishes is

s∗ = log g q Cd(0)  , (B.15)

with C d (0) = d0(n) 2  x0 , which is the known result \[20\].

B.2 Maximum Lyapunov exponent from the single-site theory

We now show that the single-site theory recovers λ1 = s∗, as the upper edge of the Lyapunov spectrum, above which F(s) = 1. Above λ1, every tangent direction decays under the shifted dynamics, so that the minimum-norm solution of Part 1 (Sec. 2.1) is the causal solution, which propagates the whole source forward. In the single-site theory, the analog of the causal solution arises when the kernels A(n, n′ ) and P(n, n′ ) vanish as η → 0 +, so that the forward field of neuron 0 follows the uncoupled shifted dynamics. We first show that vanishing kernels give F(s) = 1, and then determine for which s Eq. (66) has such a solution. When the kernels vanish as η → 0 +, so do ηI + A and ηI + γs D0P D0. The inverses in the last terms of Eqs. (63)–(64) then diverge and dominate, so that, to leading order,

R vu 00 ≈ L −1 ηI + A  L −T , (B.16) R uv 00 ≈ L −T ηI + γs D0P D0  L −1 . (B.17)

Equation (65) then gives Rvv 00 → L −1 . For s > su, where su = δ −1 log(1 − δ) is the exponent at which αs = 1, L −1 propagates the uncoupled shifted dynamics forward in time,

L −1 (n, n′ ) = ( α n−n ′−1 s , n > n′ , 0, n ≤ n ′ . (B.18)

33


<!-- Page 34 -->

In particular, Rvv 00(k + 1, k) → L −1 (k + 1, k) = 1, so that F(s) = 1. With these leading-order responses, Eq. (66) gives kernels that are linear in η and in the kernels themselves, so that the kernels A(n, n′ ) and P(n, n′ ) are proportional to η. We therefore write

A(n, n′ ) = η A1(n, n′ ), (B.19)

γsP(n, n′ ) = η P1(n, n′ ). (B.20)

For a deterministic matrix Z, ⟨D0ZD0⟩x0 has entries C d (τ )Z(n, n′ ), which we write as C d ◦ Z. Equation (66), at leading order in η, becomes

A1 = γs C d

- Σ, (B.21)

P1 = γs L −T I + C d

- P1

L −1 , (B.22) where Σ = L −1 (I + A1)L −T . Eliminating A1, these read L Σ L T − γs C d

- Σ = I, (B.23)

L TP1L − γs C d

- P1 = γsI. (B.24)

For a matrix Z whose entries Z(τ ) depend only on the lag, both (LZLT )(n, n′ ) and (L TZL)(n, n′ ) are equal to (1+α 2 s )Z(τ )−αs\[Z(τ +δ)+Z(τ −δ)\]. In the stationary state, both equations therefore apply the operator Ts of Eq. (B.8), to Σ(τ ) and to P1(τ ), with sources that differ only by the factor γs. Thus, P1(τ ) = γsΣ(τ ), and both kernels, A1(τ ) = γsC d (τ ) Σ(τ ) and P1(τ ), are determined by the single equation

(TsΣ)(τ ) = ( 1, τ = 0, 0, τ ̸= 0. (B.25)

The same operator Ts as in the calculation with two copies of the network thus decides whether the vanishing-kernel solution exists. For s > s∗, which exceeds su, 0 does not lie in the spectrum of Ts, so that Ts is invertible, and the equation for Σ(τ ) has a square-summable solution. As s decreases to s∗, 0 enters the spectrum of Ts, and Σ(τ ) diverges. Thus, the solution with vanishing kernels, and with it F(s) = 1, exists for s > s∗ but cannot be continued below s∗. Below s∗, the numerical solution of the single-site theory has kernels of order one as η → 0 + and gives F(s) < 1 (Fig. 1). Thus, the upper edge of the Lyapunov spectrum in the single-site theory is s∗, so that the single-site theory recovers λ1 = s∗ for every δ, and therefore also the results of Sompolinsky et al. \[1\] and Molgedey et al. \[20\] as δ → 0 and at δ = 1, respectively.

### Appendix C Participation-ratio dimension at finite time step

This appendix gives the details of the participation-ratio dimension at finite time step δ, summarized in Sec. 3.4. The two-site cavity derivation \[30\] carries over step by step to discrete time, with three differences. First, the single-site dynamics are those of the Euler map, Eq. (54), so that the response S x (τ ) of x0(n) to ξ0(n ′ ), with τ = (n−n ′ )δ, is δ(1−δ) n−n ′−1 for n > n′ and zero otherwise. Second, frequencies lie on the Brillouin zone θ ∈ (−π, π\] rather than on the real line. Third, we use the Fourier transform ˆf(θ) = X

n∈Z f(nδ) e −iθn , (C.1)

for functions f(τ ) of the lag, so that the factors 2π of Clark et al. \[30\] are absent. In this convention, the transform of the single-site response S x (τ ) is

Sˆx (θ) = δ e iθ − 1 + δ . (C.2)

34


<!-- Page 35 -->

With ψˆa (θ1, θ2) the transform in both lags of the four-point function ψ a (τ1, τ2), the two-site cavity derivation gives

ψˆϕ (θ1, θ2) =  1 |1 − z(θ1, θ2)| 2 − 1  Cˆϕ (θ1) Cˆϕ (θ2), (C.3)

ψˆx (θ1, θ2) = " 2 − |z(θ1, θ2)| 2 |1 − z(θ1, θ2)| 2 − 1 # Cˆx (θ1) Cˆx (θ2), (C.4)

with z(θ1, θ2) = g 2 ⟨d0(n)⟩ 2 x0 Sˆx (θ1) Sˆx (θ2), (C.5)

where Cˆϕ (θ) and Cˆx (θ) are the transforms of the autocovariances C ϕ (τ ) and C x (τ ) given by the mean-field theory, Eq. (57). Integrating over the Brillouin zone gives the value ψ a (0, 0) that enters PRa /N (Sec. 3.4),

ψ a (0, 0) = Z π

−π dθ1 2π Z π

−π dθ2 2π ψˆa (θ1, θ2). (C.6)

As δ → 0, at fixed frequency ω = θ/δ, Sˆx (θ) → 1/(1 + iω), and Eqs. (C.3)–(C.6) reduce to the continuous-time result \[30\]. To bring Eq. (C.4) into the form given there, we used Cˆx (θ) = g 2 |Sˆx (θ)| 2Cˆϕ (θ), from Eq. (54), and ⟨x0(n) ϕ(x0(n ′ ))⟩x0 = ⟨d0(n)⟩x0 C x (τ ), from Gaussian integra tion by parts.

### Appendix D Numerical methods

This appendix gives the details of the numerical solution of the single-site theory and of the simu lations, summarized in Sec. 3.2.

D.1 Single-site theory

We iterate Eq. (66) on a periodic window of m steps, covering mδ = 32 or 64 units of time, long enough that doubling the window changes the results negligibly, so that the periodic window approximates the infinite window of Part 1 (Sec. 2.1). On this window, L, A, and P are circulant and are thus diagonalized by the discrete Fourier transform. In Eqs. (63)–(65), however, D0 appears inside the inverses, and the average in Eq. (66) is taken outside these inverses. Since D0 is not translation invariant for a single gain trajectory, each sampled gain trajectory requires the inverse of an m × m matrix in the time domain. We sample sets of 1024 to 4096 gain trajectories from the Gaussian process of Eq. (57) using a scrambled Sobol sequence, with an independent scramble for each set, and average the results over one to eight sets. Near su = δ −1 log(1 − δ), where αs = 1 and the uncoupled shifted dynamics decay slowly, the kernels decay slowly, and a periodic window of fixed length misrepresents the infinite window. There, we replace the periodic boundary conditions of the window by twisted ones, under which a sequence acquires a phase e iφ after m steps, and average F(s) over φ with a quadrature of two to four points. The average over φ approximates the infinite window for a gain trajectory repeated periodically. We lower η from 0.1 δ to 1.6 × 10−4 δ (to 1.6 × 10−6 δ at g = 1.25) in steps, using each solution as the starting point for the next, and read out Eq. (67) at the smallest value. At finite δ, our code also adds the term η ⟨Rvu 00 (k, k)⟩x0 to Eq. (67). This term is a remnant of the original derivation (AI methodology) and has a negligible effect on the results, since, at the smallest η, it is below 10−4 for every s, g, and δ. We compute F(s) on a grid of values of s, interpolate monotonically between

35


<!-- Page 36 -->

them, and set F(s) = 1 above s∗, computed from Ts (Appendix B.1). For δ → 0, we solve the single-site problem in continuous time, in which L becomes δ (d/dt + 1 + s). In continuous time, a source at time t ′ makes v0(t) jump at t = t ′ , and Eq. (67) reads out Rvv 00(t, t′ ) just after this jump. We represent time on a grid with spacing 0.4 for g ≤ 5 and 0.2 at g = 6. For g ≥ 8, where the gains change on a time scale of about 1/g, we solve at spacings 0.2 and 0.125 and extrapolate to zero spacing, assuming that the error is proportional to the square of the spacing.

D.2 Simulations

We discard an initial transient of at least 300 units of time, evolve the tangent vectors for a further 200 units of time, and then average over 2000 to 8000 units of time, reorthonormalizing the tangent vectors every 0.5 units of time (every step at δ = 1). For δ → 0, we use the fourth-order Runge– Kutta method with time step 0.1 (0.05 for g ≥ 6) and propagate the tangent vectors with the exact Jacobian of the Runge–Kutta step. In Fig. 1, we compute the full Lyapunov spectrum. For most networks in Figs. 2 and 4, we compute only the largest 256 to 1024 exponents, which include every exponent above sKY and therefore suffice for DKY and hKS. Near the onset of chaos (g ≤ 1.5), only a few exponents are positive at N = 4096, and, for δ < 1, we use larger networks and the median over five networks. In Figs. 2 and 4, the simulations of the Lyapunov exponents use N = 4096 for g ≥ 2 and, for g ≤ 1.5, the median over five networks with N = 16384 for δ = 0.25 and 0.5 and with N = 8192 for δ → 0. At g = 3, they use the median over three or four networks with N = 4096 for δ = 0.25, 0.5, and 1. In Fig. 4c, the simulations also include one network with N = 16384 at g = 1.75 for δ = 0.25 and 0.5, and the simulations for δ = 1 use N = 4096 at every g. For the participation ratios, we simulate two networks with N = 16384 and average the partic ipation ratios over these two networks. For δ → 0, we use the fourth-order Runge–Kutta method with time step 0.1 (0.05 for g ≥ 12). In each network, we sample the activity every 0.5 units of time over 2×104 to 8×104 units of time and split the samples into 8 blocks. Finite sampling biases PN i,j=1 C a ij (0)2 in Eq. (71) upward, and thus PRa downward. We remove this bias by estimating PN i,j=1 C a ij (0)2 from products of covariances measured in different blocks.

36

