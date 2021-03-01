<?php

namespace Rares\ModalBundle\Response;

use Symfony\Component\HttpFoundation\JsonResponse;

class ModalRedirectResponse extends JsonResponse
{
    /**
     * Redirect to the specified url after a form inside a modal was successfully
     * submitted.
     *
     * @param string $url
     *   The url to redirect to.
     */
    public function __construct($url)
    {
        parent::__construct([
            'redirect' => $url
        ]);
    }

}
